// unified-worker.js - Combined Email + API Worker for Cloudflare
// Handles: inbound email processing, API endpoints, rate limiting, and scheduled cleanup
// This replaces both email-worker.js and api-worker.js

import {
    splitHeadersAndBody,
    parseHeaders,
    parseContentType,
    decodeContent,
    decodeMimeWords,
    parseMultipartBody,
    truncate
} from './mime-utils.js';

// ============================================
// CONFIGURATION
// ============================================

// Email retention period: 7 days in milliseconds
const EMAIL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

// Rate limiting configuration (ported from backend/src/shared/rateLimit.js)
const RATE_LIMITS = {
    TOTAL_REQUESTS_PER_MINUTE: 75,
    UNIQUE_USERNAMES_PER_MINUTE: 10,
    SAME_USERNAME_PER_MINUTE: 50,
    WINDOW_MS: 60000, // 1 minute
    MAX_IPS_TRACKED: 500,
    CLEANUP_INTERVAL: 60000 // Cleanup every 60 seconds
};

// ============================================
// EMAIL FILTERING CONFIGURATION
// ============================================

// Default blocked sender patterns (Meta/Facebook related)
const DEFAULT_BLOCKED_SENDER_PATTERNS = [
    'registration@facebook',
    'registrations@mail.instagram.com',
    'registration@facebookmail.com',
    'groupupdates@facebookmail.com',
    'reminders@facebookmail.com',
    'friendsuggestion@facebookmail.com',
    'pageupdates@facebookmail.com'
];

// Default blocked subject patterns (verification codes)
const DEFAULT_BLOCKED_SUBJECT_PATTERNS = [
    /\d{6}.*adalah kode instagram anda/i,
    /\d{6}.*is your threads code/i,
    /\d{6}.*is your instagram code/i,
    /\d{4,6}.*is your confirmation code/i,
    /fb-\d{4,6}.*is your confirmation code/i
];

// ============================================
// IN-MEMORY RATE LIMITING (per-isolate)
// Note: In Workers, each isolate has its own memory, so this is
// approximate rate limiting. For strict limiting, use Durable Objects.
// ============================================

const rateLimits = new Map();
let lastCleanup = Date.now();

/**
 * Cleanup expired rate limit entries
 */
const cleanupRateLimits = () => {
    const now = Date.now();
    const ipsToDelete = [];

    rateLimits.forEach((data, ip) => {
        if (now > data.resetTime) {
            ipsToDelete.push(ip);
        }
    });

    ipsToDelete.forEach(ip => rateLimits.delete(ip));

    // Aggressive LRU cleanup if approaching memory limit
    if (rateLimits.size > RATE_LIMITS.MAX_IPS_TRACKED) {
        const sortedIPs = Array.from(rateLimits.entries())
            .sort((a, b) => a[1].resetTime - b[1].resetTime)
            .slice(0, Math.floor(RATE_LIMITS.MAX_IPS_TRACKED * 0.7));

        sortedIPs.forEach(([ip]) => rateLimits.delete(ip));
        console.log(`[MEMORY] Cleaned up ${sortedIPs.length} old IP entries, now tracking ${rateLimits.size} IPs`);
    }

    lastCleanup = now;
};

/**
 * Check rate limit for a username from a client IP
 * @param {string} username 
 * @param {string} clientIP 
 * @returns {{allowed: boolean, error: string|null}}
 */
const checkRateLimit = (username, clientIP) => {
    const now = Date.now();

    // Input validation
    if (!clientIP || clientIP === 'unknown') {
        return { allowed: false, error: 'Rate limit exceeded: Unable to identify client.' };
    }

    // Periodic cleanup with reduced frequency
    if (now - lastCleanup > RATE_LIMITS.CLEANUP_INTERVAL) {
        cleanupRateLimits();
    }

    // Get or create IP data
    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, {
            requestTimestamps: [],
            uniqueUsernames: new Set(),
            resetTime: now + RATE_LIMITS.WINDOW_MS
        });
    }

    const ipData = rateLimits.get(clientIP);

    // Reset if window expired
    if (now > ipData.resetTime) {
        ipData.requestTimestamps = [];
        ipData.uniqueUsernames.clear();
        ipData.resetTime = now + RATE_LIMITS.WINDOW_MS;
    }

    // Remove old timestamps from sliding window
    const windowStart = now - RATE_LIMITS.WINDOW_MS;
    ipData.requestTimestamps = ipData.requestTimestamps.filter(timestamp => timestamp > windowStart);

    // Check total requests limit
    if (ipData.requestTimestamps.length >= RATE_LIMITS.TOTAL_REQUESTS_PER_MINUTE) {
        return { allowed: false, error: 'Rate limit exceeded: Too many requests. Please try again later.' };
    }

    // Check unique usernames limit
    if (!ipData.uniqueUsernames.has(username)) {
        if (ipData.uniqueUsernames.size >= RATE_LIMITS.UNIQUE_USERNAMES_PER_MINUTE) {
            return { allowed: false, error: 'Rate limit exceeded: Too many different emails tried. Please try again later.' };
        }
        ipData.uniqueUsernames.add(username);
    }

    // Check same username frequency
    const recentUsernameRequests = ipData.requestTimestamps.filter((_, index) => {
        return index >= ipData.requestTimestamps.length - RATE_LIMITS.SAME_USERNAME_PER_MINUTE;
    });

    if (recentUsernameRequests.length >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
        return { allowed: false, error: 'Rate limit exceeded: Too many requests for this email. Please try again later.' };
    }

    // Add current request timestamp
    ipData.requestTimestamps.push(now);

    return { allowed: true, error: null };
};

// ============================================
// USERNAME VALIDATION (ported from backend/src/shared/emailFilter.js)
// ============================================

/**
 * Load banned usernames from environment variable
 * @param {Object} env - Cloudflare Worker environment
 * @returns {Set<string>}
 */
const getBannedUsernames = (env) => {
    const bannedUsernamesEnv = env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set();
};

/**
 * Validate username format and check if banned
 * @param {string} username 
 * @param {Object} env - Cloudflare Worker environment
 * @returns {{valid: boolean, error: string|null}}
 */
const validateUsername = (username, env) => {
    if (!username || !username.trim()) {
        return { valid: false, error: 'Username is required.' };
    }

    const bannedUsernames = getBannedUsernames(env);
    if (bannedUsernames.has(username.toLowerCase())) {
        return { valid: false, error: `Invalid username: '${username}' is not allowed.` };
    }

    // Must start with alphanumeric, then can have alphanumeric, underscore, period, or hyphen
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!regex.test(username)) {
        return { valid: false, error: `Invalid username: '${username}' contains invalid characters.` };
    }

    return { valid: true, error: null };
};

// ============================================
// EMAIL FILTERING HELPERS
// ============================================

/**
 * Load comma-separated keywords from environment variable
 * @param {Object} env - Cloudflare Worker environment
 * @param {string} key - Environment variable name
 * @returns {string[]} Array of lowercase keywords
 */
const loadKeywordsFromEnv = (env, key) => {
    const value = env[key] || '';
    if (!value.trim()) return [];
    return value.split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 0);
};

/**
 * Check if an email should be filtered (blocked) before storage
 * @param {string} sender - Sender email address
 * @param {string} subject - Email subject
 * @param {string} body - Email body text
 * @param {Object} env - Cloudflare Worker environment
 * @returns {{blocked: boolean, reason: string|null}}
 */
const shouldBlockEmail = (sender, subject, body, env) => {
    const senderLower = (sender || '').toLowerCase();
    const subjectLower = (subject || '').toLowerCase();
    const bodyLower = (body || '').toLowerCase();

    // Check default blocked sender patterns
    for (const pattern of DEFAULT_BLOCKED_SENDER_PATTERNS) {
        if (senderLower.includes(pattern.toLowerCase())) {
            return { blocked: true, reason: `sender matches default pattern: ${pattern}` };
        }
    }

    // Check default blocked subject patterns (regex)
    for (const pattern of DEFAULT_BLOCKED_SUBJECT_PATTERNS) {
        if (pattern.test(subject || '')) {
            return { blocked: true, reason: `subject matches default pattern` };
        }
    }

    // Check configurable sender keywords (BLOCKED_SENDER_KEYWORDS env var)
    const blockedSenderKeywords = loadKeywordsFromEnv(env, 'BLOCKED_SENDER_KEYWORDS');
    for (const keyword of blockedSenderKeywords) {
        if (senderLower.includes(keyword)) {
            return { blocked: true, reason: `sender contains blocked keyword: ${keyword}` };
        }
    }

    // Check configurable subject keywords (BLOCKED_SUBJECT_KEYWORDS env var)
    const blockedSubjectKeywords = loadKeywordsFromEnv(env, 'BLOCKED_SUBJECT_KEYWORDS');
    for (const keyword of blockedSubjectKeywords) {
        if (subjectLower.includes(keyword)) {
            return { blocked: true, reason: `subject contains blocked keyword: ${keyword}` };
        }
    }

    // Check configurable body keywords (BLOCKED_BODY_KEYWORDS env var)
    const blockedBodyKeywords = loadKeywordsFromEnv(env, 'BLOCKED_BODY_KEYWORDS');
    for (const keyword of blockedBodyKeywords) {
        if (bodyLower.includes(keyword)) {
            return { blocked: true, reason: `body contains blocked keyword: ${keyword}` };
        }
    }

    return { blocked: false, reason: null };
};

// ============================================
// EMAIL PARSING HELPERS
// ============================================

const extractBodiesFromRaw = (rawEmail) => {
    const [headerText, bodyText] = splitHeadersAndBody(rawEmail);
    const headers = parseHeaders(headerText);
    const contentType = parseContentType(headers['content-type']);
    const encoding = headers['content-transfer-encoding'];

    if (contentType.mime.startsWith('multipart/') && contentType.params.boundary) {
        return parseMultipartBody(bodyText, contentType.params.boundary);
    }

    const decoded = decodeContent(bodyText, encoding, contentType.params.charset);
    if (contentType.mime === 'text/html') {
        return { html: decoded, text: '' };
    }
    return { html: '', text: decoded };
};

const normalizeAddress = (value) => {
    if (!value) return '';
    if (Array.isArray(value)) {
        return value.map(normalizeAddress).filter(Boolean).join(', ');
    }
    if (typeof value === 'object') {
        return value.address || value.email || value.toString();
    }
    return String(value);
};

const detectBoundary = (body) => {
    if (!body) return '';
    const direct = body.match(/^\s*--([^\r\n]+)/);
    if (direct) return direct[1].trim();
    const indirect = body.match(/\r?\n--([^\r\n]+)/);
    return indirect ? indirect[1].trim() : '';
};

const extractBodiesFromStoredText = (bodyText) => {
    if (!bodyText) return { html: '', text: '' };
    const boundary = detectBoundary(bodyText);
    if (!boundary) {
        return { html: '', text: bodyText.trim() };
    }
    return parseMultipartBody(bodyText, boundary);
};

// ============================================
// HTTP RESPONSE HELPERS
// ============================================

/**
 * Get client IP from request headers
 * @param {Request} request
 * @returns {string}
 */
const getClientIP = (request) => {
    // Cloudflare provides the connecting IP
    return request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Real-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';
};

/**
 * Create standardized CORS + security headers
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object}
 */
const createHeaders = (additionalHeaders = {}) => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Security headers (HTML sanitization)
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...additionalHeaders
});

/**
 * Create JSON response
 * @param {any} data 
 * @param {number} status 
 * @param {Object} additionalHeaders
 * @returns {Response}
 */
const jsonResponse = (data, status = 200, additionalHeaders = {}) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: createHeaders(additionalHeaders)
    });
};

// ============================================
// MAIN WORKER EXPORT
// ============================================

export default {
    /**
     * Email handler - processes inbound emails from Cloudflare Email Routing
     */
    async email(message, env, ctx) {
        try {
            const rawEmail = await new Response(message.raw).text();
            const [headerText] = splitHeadersAndBody(rawEmail);
            const headers = parseHeaders(headerText);

            const subjectRaw = headers['subject'] || message.headers?.get?.('subject') || '(No Subject)';
            const subject = decodeMimeWords(subjectRaw) || '(No Subject)';

            const sender = headers['from'] || normalizeAddress(message.from);
            const recipient = headers['to'] || normalizeAddress(message.to);

            const { html, text } = extractBodiesFromRaw(rawEmail);

            // EMAIL FILTERING - Block unwanted emails before storage
            const filterResult = shouldBlockEmail(sender, subject, text || html, env);
            if (filterResult.blocked) {
                console.log(`[FILTER] Email blocked for ${recipient}: ${filterResult.reason}`);
                return; // Don't store - saves D1 quota
            }

            const emailId = crypto.randomUUID();

            await env.DB.prepare(`
                INSERT INTO emails (id, recipient, sender, subject, body_html, body_text, received_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).bind(
                emailId,
                recipient,
                sender,
                subject,
                truncate(html),
                truncate(text),
                Date.now()
            ).run();

            console.log(`Email stored: ${emailId} for ${recipient}`);

        } catch (error) {
            console.error('Error processing email:', error);
        }
    },

    /**
     * HTTP fetch handler - API endpoints for frontend
     */
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: createHeaders() });
        }

        try {
            // ============================================
            // GET /api/events?recipient=user@domain.com
            // Returns list of emails for a recipient
            // Admin access: recipient=* AND admin_key=<secret>
            // ============================================
            if (path === '/api/events') {
                const recipient = url.searchParams.get('recipient');
                if (!recipient) {
                    return jsonResponse({ error: 'Missing recipient parameter' }, 400);
                }

                const trimmedRecipient = recipient.trim();
                if (!trimmedRecipient) {
                    return jsonResponse({ error: 'Missing recipient parameter' }, 400);
                }

                // Check for admin access (wildcard)
                const isAdminRequest = trimmedRecipient === '*' || trimmedRecipient === 'all';
                let lookupRecipient = trimmedRecipient;

                // For non-admin requests, validate username and apply rate limiting
                if (!isAdminRequest) {
                    // Extract username from email or use as-is
                    const username = lookupRecipient.includes('@')
                        ? lookupRecipient.split('@')[0]
                        : lookupRecipient;

                    // Validate username format
                    const validation = validateUsername(username, env);
                    if (!validation.valid) {
                        return jsonResponse({ error: validation.error }, 400);
                    }

                    // Apply rate limiting
                    const clientIP = getClientIP(request);
                    const rateCheck = checkRateLimit(username, clientIP);
                    if (!rateCheck.allowed) {
                        console.log(`[RATE LIMIT] ${clientIP} exceeded limit for ${username}`);
                        return jsonResponse({ error: rateCheck.error }, 429);
                    }

                    // Add domain if missing
                    if (!lookupRecipient.includes('@')) {
                        if (env.EMAIL_DOMAIN) {
                            lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
                        } else {
                            return jsonResponse({ error: 'EMAIL_DOMAIN is not configured' }, 400);
                        }
                    }
                }

                let result;

                if (isAdminRequest) {
                    // SECURITY: Admin access requires valid admin_key
                    const adminKey = url.searchParams.get('admin_key');
                    const validAdminKey = env.ADMIN_ACCESS_KEY;

                    if (!validAdminKey || !adminKey || adminKey !== validAdminKey) {
                        console.log('[SECURITY] Unauthorized admin access attempt');
                        return jsonResponse({ error: 'Unauthorized' }, 403);
                    }

                    // Authorized admin access - return all emails
                    console.log('[ADMIN] Authorized - Fetching all emails');
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at 
                        FROM emails 
                        ORDER BY received_at DESC 
                        LIMIT 100
                    `).all();
                } else {
                    // Regular user access - filter by specific recipient
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at 
                        FROM emails 
                        WHERE recipient = ? 
                        ORDER BY received_at DESC 
                        LIMIT 50
                    `).bind(lookupRecipient).all();
                }

                // Format response like Mailgun events API (for compatibility)
                const items = result.results.map(row => ({
                    id: row.id,
                    timestamp: row.received_at / 1000,
                    event: 'stored',
                    message: {
                        headers: {
                            from: row.sender,
                            to: row.recipient,
                            subject: decodeMimeWords(row.subject || '')
                        }
                    },
                    storage: {
                        key: row.id,
                        url: `/api/email/${row.id}`
                    }
                }));

                return jsonResponse({ items });
            }

            // ============================================
            // GET /api/list?recipient=user@domain.com
            // Legacy endpoint compatibility
            // ============================================
            if (path === '/api/list') {
                // Reuse events logic but return array
                const recipient = url.searchParams.get('recipient');
                if (!recipient) return jsonResponse({ error: 'Missing recipient' }, 400);

                const trimmedRecipient = recipient.trim();
                const validAdminKey = env.ADMIN_ACCESS_KEY;

                // Check if this is an authorized admin request
                let isAuthorizedAdmin = false;

                if (validAdminKey) {
                    // Check if recipient matches the admin key directly
                    if (trimmedRecipient === validAdminKey) {
                        isAuthorizedAdmin = true;
                    }
                    // Check wildcard with admin_key param
                    else if (trimmedRecipient === '*' || trimmedRecipient === 'all') {
                        const providedKey = url.searchParams.get('admin_key');
                        if (providedKey === validAdminKey) {
                            isAuthorizedAdmin = true;
                        }
                    }
                }

                // Validate if not authorized admin
                if (!isAuthorizedAdmin) {
                    const username = trimmedRecipient.split('@')[0];
                    const v = validateUsername(username, env);
                    if (!v.valid) return jsonResponse({ error: v.error }, 400);

                    // Rate limit
                    const ip = getClientIP(request);
                    const rl = checkRateLimit(username, ip);
                    if (!rl.allowed) return jsonResponse({ error: rl.error }, 429);
                }

                // Query DB
                let result;
                if (isAuthorizedAdmin) {
                    // Fetch all emails (admin view)
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at 
                        FROM emails 
                        ORDER BY received_at DESC 
                        LIMIT 100
                    `).all();
                } else {
                    // Fetch specific recipient emails
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at 
                        FROM emails 
                        WHERE recipient = ? 
                        ORDER BY received_at DESC 
                        LIMIT 50
                    `).bind(trimmedRecipient).all();
                }

                // Format as array of messages with 'storage' keys
                const items = result.results.map(row => ({
                    url: `/api/list?recipient=${row.recipient}`,
                    timestamp: row.received_at / 1000,
                    message: {
                        headers: {
                            from: row.sender,
                            to: row.recipient,
                            subject: decodeMimeWords(row.subject || '')
                        },
                        preview: '(No preview)' // D1 doesn't fetch body here for performance
                    },
                    storage: {
                        key: row.id,
                        region: 'us' // Dummy region
                    }
                }));

                return jsonResponse(items);
            }

            // ============================================
            // GET /api/getKey?key=...
            // Legacy endpoint for metadata
            // ============================================
            if (path === '/api/getKey') {
                const key = url.searchParams.get('key');
                if (!key) return jsonResponse({ error: 'Missing key' }, 400);

                const row = await env.DB.prepare('SELECT * FROM emails WHERE id = ?').bind(key).first();
                if (!row) return jsonResponse({ error: 'Not found' }, 404);

                // Extract name/email from sender
                const fromRaw = row.sender || '';
                const nameMatch = fromRaw.match(/^"?(.*?)"?\s*</);
                const emailMatch = fromRaw.match(/<(.+)>/);
                const name = nameMatch ? nameMatch[1] : (fromRaw.split('<')[0].trim() || 'Unknown');
                const emailAddress = emailMatch ? emailMatch[1] : (fromRaw || 'Unknown');

                return jsonResponse({
                    subject: decodeMimeWords(row.subject || ''),
                    name: name,
                    emailAddress: emailAddress,
                    recipients: row.recipient,
                    Date: new Date(row.received_at).toISOString()
                });
            }

            // ============================================
            // GET /api/getHtml?key=...
            // Legacy endpoint for HTML content
            // ============================================
            if (path === '/api/getHtml') {
                const key = url.searchParams.get('key');
                if (!key) return new Response('Missing key', { status: 400 });

                const row = await env.DB.prepare('SELECT body_html, body_text FROM emails WHERE id = ?').bind(key).first();
                if (!row) return new Response('Not found', { status: 404 });

                let html = row.body_html;
                if (!html && row.body_text) {
                    // Fallback: Try to recover content from body_text
                    let text = row.body_text;

                    // heuristic: if text contains QP artifacts, try to decode
                    if (text.includes('=\r\n') || text.includes('=\n') || text.includes('=3D')) {
                        try {
                            text = decodeContent(text, 'quoted-printable', 'utf-8');
                        } catch (e) {
                            console.warn('[getHtml] Failed to decode QP:', e);
                        }
                    }

                    // heuristic: if it looks like HTML, treat as HTML
                    if (text.trim().startsWith('<') || text.includes('</')) {
                        html = text;
                    } else {
                        // Otherwise wrap plain text
                        html = `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; line-height: 1.5; text-wrap: pretty; color: #374151;">${text.replace(/\n/g, '<br>')}</div>`;
                    }
                }

                return new Response(html || '', {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'X-Frame-Options': 'SAMEORIGIN' // Allow same origin framing
                    }
                });
            }

            // ============================================
            // GET /api/email/:id?recipient=user@domain.com
            // Returns full email content
            // Security: Requires both email ID AND matching recipient
            // ============================================
            if (path.startsWith('/api/email/')) {
                const emailId = path.replace('/api/email/', '');
                const recipient = url.searchParams.get('recipient');

                // Require recipient parameter for compound key validation
                if (!recipient) {
                    return jsonResponse({ error: 'Missing recipient parameter' }, 400);
                }

                // Normalize recipient (add domain if missing)
                let lookupRecipient = recipient.trim();

                // Validate username format
                const username = lookupRecipient.includes('@')
                    ? lookupRecipient.split('@')[0]
                    : lookupRecipient;

                const validation = validateUsername(username, env);
                if (!validation.valid) {
                    return jsonResponse({ error: validation.error }, 400);
                }

                if (!lookupRecipient.includes('@')) {
                    if (env.EMAIL_DOMAIN) {
                        lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
                    } else {
                        return jsonResponse({ error: 'EMAIL_DOMAIN is not configured' }, 400);
                    }
                }

                // Validate both ID AND recipient match (compound key security)
                const result = await env.DB.prepare(`
                    SELECT * FROM emails WHERE id = ? AND recipient = ?
                `).bind(emailId, lookupRecipient).first();

                if (!result) {
                    return jsonResponse({ error: 'Email not found' }, 404);
                }

                let bodyHtml = result.body_html || '';
                let bodyText = result.body_text || '';

                if (!bodyHtml && bodyText) {
                    const extracted = extractBodiesFromStoredText(bodyText);
                    if (extracted.html) {
                        bodyHtml = extracted.html;
                    }
                    if (extracted.text) {
                        bodyText = extracted.text;
                    }
                }

                return jsonResponse({
                    from: result.sender,
                    to: result.recipient,
                    subject: decodeMimeWords(result.subject || ''),
                    'body-html': truncate(bodyHtml),
                    'body-plain': truncate(bodyText),
                    timestamp: result.received_at
                });
            }

            // ============================================
            // GET /api/health
            // Health check endpoint
            // ============================================
            if (path === '/api/health') {
                return jsonResponse({ status: 'ok' });
            }

            // 404 for unknown routes
            return jsonResponse({ error: 'Not found' }, 404);

        } catch (error) {
            console.error('API Error:', error);
            return jsonResponse({ error: 'Internal server error' }, 500);
        }
    },

    /**
     * Scheduled cron handler - runs daily to clean up old emails
     * Configure in wrangler.toml:
     * [triggers]
     * crons = ["0 0 * * *"]  # Runs at midnight UTC daily
     */
    async scheduled(event, env, ctx) {
        const cutoffTime = Date.now() - EMAIL_RETENTION_MS;

        try {
            // Count emails to be deleted (for logging)
            const countResult = await env.DB.prepare(`
                SELECT COUNT(*) as count FROM emails WHERE received_at < ?
            `).bind(cutoffTime).first();

            const count = countResult?.count || 0;

            if (count > 0) {
                // Delete emails older than retention period
                await env.DB.prepare(`
                    DELETE FROM emails WHERE received_at < ?
                `).bind(cutoffTime).run();

                console.log(`[CLEANUP] Deleted ${count} emails older than 7 days`);
            } else {
                console.log('[CLEANUP] No old emails to delete');
            }
        } catch (error) {
            console.error('[CLEANUP] Error during email cleanup:', error);
        }
    }
};
