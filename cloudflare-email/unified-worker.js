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

// Email retention period: 3 days in milliseconds (reduced from 7 for storage control)
const EMAIL_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

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
    // Facebook registration (blocks spam account creation)
    'registration@facebook',
    'registration@facebookmail.com',
    // Facebook notifications (high volume - saves D1 quota)
    'notification@facebookmail.com',
    'friendsuggestion@facebookmail.com',
    'friendupdates@facebookmail.com',
    'friends@facebookmail.com',
    'close_friend_updates@facebookmail.com',
    'groupupdates@facebookmail.com',
    'pageupdates@facebookmail.com',
    'reminders@facebookmail.com',
    // Instagram notifications (NOT registrations - those are legitimate)
    'posts-recaps@mail.instagram.com'
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
    'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    // Security headers (HTML sanitization)
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...additionalHeaders
});

/**
 * Generate a simple ETag from data
 * @param {any} data
 * @returns {string}
 */
const generateETag = (data) => {
    const str = JSON.stringify(data);
    // Simple hash for ETag - FNV-1a variant
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return `"${hash.toString(16)}"`;
};

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

/**
 * Create cached JSON response with ETag support for 304
 * @param {Request} request - The incoming request
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @param {number} maxAge - Cache max-age in seconds (default 10s for dynamic content)
 * @returns {Response}
 */
const cachedJsonResponse = (request, data, status = 200, maxAge = 10) => {
    const etag = generateETag(data);
    const ifNoneMatch = request.headers.get('If-None-Match');

    // Return 304 Not Modified if ETag matches
    if (ifNoneMatch && ifNoneMatch === etag) {
        return new Response(null, {
            status: 304,
            headers: createHeaders({
                'ETag': etag,
                'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=60`
            })
        });
    }

    return new Response(JSON.stringify(data), {
        status,
        headers: createHeaders({
            'ETag': etag,
            'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=60`,
            'Vary': 'Accept, If-None-Match'
        })
    });
};

// ============================================
// CLEANUP LOGIC
// ============================================

const runCleanup = async (env) => {
    const cutoffTime = Date.now() - EMAIL_RETENTION_MS;
    let totalDeleted = 0;
    let deletedBatch = 0;

    console.log('[CLEANUP] Starting cleanup...');

    try {
        // 1. Delete spam/blocked senders (aggressive)
        // Batched delete for spam
        const spamPatterns = [
            '%friendsuggestion@facebookmail.com%',
            '%reminders@facebookmail.com%',
            '%groupupdates@facebookmail.com%',
            '%pageupdates@facebookmail.com%',
            '%notification@facebookmail.com%',
            '%friendupdates@facebookmail.com%',
            '%friends@facebookmail.com%',
            '%close_friend_updates@facebookmail.com%',
            '%posts-recaps@mail.instagram.com%',
            '%registration@facebookmail.com%'
        ];

        for (const pattern of spamPatterns) {
            const result = await env.DB.prepare(`
                DELETE FROM emails WHERE sender LIKE ?
             `).bind(pattern).run();
            console.log(`[CLEANUP] Deleted spam pattern ${pattern}: ${result.meta.changes} rows`);
        }

        // 2. Delete old emails in batches of 1000 to avoid timeout
        do {
            const result = await env.DB.prepare(`
                DELETE FROM emails 
                WHERE id IN (
                    SELECT id FROM emails 
                    WHERE received_at < ? 
                    LIMIT 1000
                )
            `).bind(cutoffTime).run();

            deletedBatch = result.meta.changes;
            totalDeleted += deletedBatch;
            console.log(`[CLEANUP] Batch deleted: ${deletedBatch}`);

        } while (deletedBatch > 0 && totalDeleted < 20000); // Limit to 20k per run to prevent timeout

        console.log(`[CLEANUP] Completed. Total old emails deleted: ${totalDeleted}`);
        return { success: true, deleted: totalDeleted };

    } catch (error) {
        console.error('[CLEANUP] Error:', error);
        return { success: false, error: error.message };
    }
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

            const sender = headers['from'] || message.from;

            // Extract clean email address from "To" header (may be "Name <email>" format)
            const rawTo = headers['to'] || message.to;
            let recipient = rawTo;
            const emailMatch = rawTo.match(/<([^>]+)>/);
            if (emailMatch) {
                recipient = emailMatch[1]; // Extract email from <email>
            } else if (rawTo.includes('@')) {
                // Already just an email address
                recipient = rawTo.trim();
            }
            // Normalize to lowercase for consistent matching
            recipient = recipient.toLowerCase();

            const { html, text } = extractBodiesFromRaw(rawEmail);

            // EMAIL FILTERING - Block unwanted emails before storage
            const filterResult = shouldBlockEmail(sender, subject, text || html, env);
            if (filterResult.blocked) {
                console.log(`[FILTER] Email blocked for ${recipient}: ${filterResult.reason}`);
                return; // Don't store - saves D1 quota
            }

            const emailId = crypto.randomUUID();

            // Generate preview from text (first 100 chars, stripped of extra whitespace)
            const previewText = (text || html || '')
                .replace(/<[^>]*>/g, '') // Strip HTML tags
                .replace(/\s+/g, ' ')    // Normalize whitespace
                .trim()
                .substring(0, 100);

            await env.DB.prepare(`
                INSERT INTO emails (id, recipient, sender, subject, body_html, body_text, preview, received_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                emailId,
                recipient,
                sender,
                subject,
                truncate(html),
                truncate(text),
                previewText || null,
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
                        SELECT id, recipient, sender, subject, preview, received_at, read_at 
                        FROM emails 
                        ORDER BY received_at DESC 
                        LIMIT 100
                    `).all();
                } else {
                    // Regular user access - search for recipient using case-insensitive matching
                    // Normalize to lowercase since recipients are stored lowercase (line 520)
                    const rawUsername = lookupRecipient.split('@')[0].toLowerCase();
                    const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');
                    const normalizedRecipient = lookupRecipient.toLowerCase();

                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, preview, received_at, read_at 
                        FROM emails 
                        WHERE recipient = ? OR recipient = ? OR recipient LIKE ?
                        ORDER BY received_at DESC 
                        LIMIT 50
                    `).bind(normalizedRecipient, fullEmail, '%' + rawUsername + '@%').all();
                }

                // Format response like Mailgun events API (for compatibility)
                const items = result.results.map(row => ({
                    id: row.id,
                    timestamp: row.received_at / 1000,
                    event: 'stored',
                    read_at: row.read_at ? row.read_at / 1000 : null,
                    preview: row.preview || null,
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

                return cachedJsonResponse(request, { items }, 200, 15);
            }

            // ============================================
            // GET /api/stream?recipient=user@domain.com
            // Server-Sent Events for real-time email notifications
            // Polls D1 every 3s for ~25s, then client should reconnect
            // Admin access: recipient=* AND admin_key=<secret>
            // ============================================
            if (path === '/api/stream') {
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

                // For non-admin requests, validate username
                if (!isAdminRequest) {
                    const username = lookupRecipient.includes('@')
                        ? lookupRecipient.split('@')[0]
                        : lookupRecipient;

                    const validation = validateUsername(username, env);
                    if (!validation.valid) {
                        return jsonResponse({ error: validation.error }, 400);
                    }

                    // Rate limit (lighter for SSE - counts as 1 request for the whole stream)
                    const clientIP = getClientIP(request);
                    const rateCheck = checkRateLimit(username, clientIP);
                    if (!rateCheck.allowed) {
                        return jsonResponse({ error: rateCheck.error }, 429);
                    }

                    if (!lookupRecipient.includes('@')) {
                        if (env.EMAIL_DOMAIN) {
                            lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
                        } else {
                            return jsonResponse({ error: 'EMAIL_DOMAIN is not configured' }, 400);
                        }
                    }
                } else {
                    // Admin wildcard requires key
                    const adminKey = url.searchParams.get('admin_key');
                    const validAdminKey = env.ADMIN_ACCESS_KEY;
                    if (!validAdminKey || !adminKey || adminKey !== validAdminKey) {
                        return jsonResponse({ error: 'Unauthorized' }, 403);
                    }
                }

                // SSE Response with streaming
                const { readable, writable } = new TransformStream();
                const writer = writable.getWriter();
                const encoder = new TextEncoder();

                // Helper to send SSE event
                const sendEvent = async (eventType, data) => {
                    const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
                    await writer.write(encoder.encode(message));
                };

                // Start the SSE stream in background
                ctx.waitUntil((async () => {
                    try {
                        let lastEmailId = null;
                        // Normalize for case-insensitive matching
                        const rawUsername = lookupRecipient.split('@')[0].toLowerCase();
                        const fullEmail = (rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com')).toLowerCase();
                        const normalizedRecipient = lookupRecipient.toLowerCase();
                        const pollInterval = 3000; // 3 seconds
                        const maxDuration = 25000; // 25 seconds total
                        const startTime = Date.now();

                        // Send initial connection event
                        await sendEvent('connected', { recipient: lookupRecipient, timestamp: Date.now() });

                        while (Date.now() - startTime < maxDuration) {
                            let result;

                            if (isAdminRequest) {
                                result = await env.DB.prepare(`
                                    SELECT id, recipient, sender, subject, received_at, read_at 
                                    FROM emails 
                                    ORDER BY received_at DESC 
                                    LIMIT 20
                                `).all();
                            } else {
                                const normalizedRecipient = lookupRecipient.toLowerCase();
                                result = await env.DB.prepare(`
                                    SELECT id, recipient, sender, subject, received_at, read_at 
                                    FROM emails 
                                    WHERE recipient = ? OR recipient = ? OR recipient LIKE ?
                                    ORDER BY received_at DESC 
                                    LIMIT 20
                                `).bind(normalizedRecipient, fullEmail, '%' + rawUsername + '@%').all();
                            }

                            const emails = result.results || [];

                            // Check for new emails (compare with last known ID)
                            if (emails.length > 0) {
                                const newestId = emails[0].id;

                                if (lastEmailId === null) {
                                    // First poll - send all current emails
                                    const items = emails.map(row => ({
                                        id: row.id,
                                        timestamp: row.received_at / 1000,
                                        event: 'stored',
                                        read_at: row.read_at ? row.read_at / 1000 : null,
                                        message: {
                                            headers: {
                                                from: row.sender,
                                                to: row.recipient,
                                                subject: decodeMimeWords(row.subject || '')
                                            }
                                        },
                                        storage: { key: row.id }
                                    }));
                                    await sendEvent('initial', { items, count: items.length });
                                    lastEmailId = newestId;
                                } else if (newestId !== lastEmailId) {
                                    // New email(s) detected - find and send new ones
                                    const newEmails = [];
                                    for (const row of emails) {
                                        if (row.id === lastEmailId) break;
                                        newEmails.push({
                                            id: row.id,
                                            timestamp: row.received_at / 1000,
                                            event: 'stored',
                                            read_at: row.read_at ? row.read_at / 1000 : null,
                                            message: {
                                                headers: {
                                                    from: row.sender,
                                                    to: row.recipient,
                                                    subject: decodeMimeWords(row.subject || '')
                                                }
                                            },
                                            storage: { key: row.id }
                                        });
                                    }
                                    if (newEmails.length > 0) {
                                        await sendEvent('new_email', { items: newEmails, count: newEmails.length });
                                    }
                                    lastEmailId = newestId;
                                }
                            }

                            // Send heartbeat to keep connection alive
                            await sendEvent('heartbeat', { timestamp: Date.now() });

                            // Wait before next poll
                            await new Promise(resolve => setTimeout(resolve, pollInterval));
                        }

                        // Stream ending - client should reconnect
                        await sendEvent('reconnect', { message: 'Stream timeout, please reconnect' });
                        await writer.close();
                    } catch (error) {
                        console.error('[SSE] Stream error:', error);
                        try {
                            await sendEvent('error', { message: error.message });
                            await writer.close();
                        } catch (e) {
                            // Connection already closed
                        }
                    }
                })());

                return new Response(readable, {
                    headers: {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                        'Access-Control-Allow-Origin': '*',
                        'X-Accel-Buffering': 'no' // Disable nginx buffering
                    }
                });
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
                let debugReason = 'User access';

                if (validAdminKey) {
                    // Check if recipient matches the admin key directly
                    if (trimmedRecipient === validAdminKey) {
                        isAuthorizedAdmin = true;
                        debugReason = 'Admin key match';
                    }
                    // Check wildcard with admin_key param
                    else if (trimmedRecipient === '*' || trimmedRecipient === 'all') {
                        const providedKey = url.searchParams.get('admin_key');
                        if (providedKey === validAdminKey) {
                            isAuthorizedAdmin = true;
                            debugReason = 'Admin wildcard match';
                        }
                    }
                } else {
                    debugReason = 'ADMIN_ACCESS_KEY not configured';
                }

                // DEBUG: Add headers to trace auth issues
                const debugHeaders = {
                    'X-Debug-Auth': isAuthorizedAdmin ? 'Admin' : 'User',
                    'X-Debug-Reason': debugReason
                };

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
                        SELECT id, recipient, sender, subject, preview, received_at, read_at 
                        FROM emails 
                        ORDER BY received_at DESC 
                        LIMIT 100
                    `).all();
                } else {
                    // Fetch specific recipient emails
                    // Normalize to lowercase since recipients are stored lowercase
                    const rawUsername = trimmedRecipient.split('@')[0].toLowerCase();
                    const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');
                    const normalizedRecipient = trimmedRecipient.toLowerCase();

                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, preview, received_at, read_at 
                        FROM emails 
                        WHERE recipient = ? OR recipient = ? OR recipient LIKE ?
                        ORDER BY received_at DESC 
                        LIMIT 50
                    `).bind(normalizedRecipient, fullEmail, '%' + rawUsername + '@%').all();
                }

                // Format as array of messages with 'storage' keys
                const items = result.results.map(row => ({
                    url: `/api/list?recipient=${row.recipient}`,
                    timestamp: row.received_at / 1000,
                    read_at: row.read_at ? row.read_at / 1000 : null,
                    preview: row.preview || null,
                    message: {
                        headers: {
                            from: row.sender,
                            to: row.recipient,
                            subject: decodeMimeWords(row.subject || '')
                        }
                    },
                    storage: {
                        key: row.id,
                        region: 'us' // Dummy region
                    }
                }));

                return cachedJsonResponse(request, items, 200, 15);
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

                return cachedJsonResponse(request, {
                    subject: decodeMimeWords(row.subject || ''),
                    name: name,
                    emailAddress: emailAddress,
                    recipients: row.recipient,
                    Date: new Date(row.received_at).toISOString()
                }, 200, 60);
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

                // Generate ETag for HTML content
                const htmlContent = html || '';
                const htmlEtag = generateETag(htmlContent);
                const ifNoneMatch = request.headers.get('If-None-Match');

                // Return 304 if content hasn't changed
                if (ifNoneMatch && ifNoneMatch === htmlEtag) {
                    return new Response(null, {
                        status: 304,
                        headers: {
                            'ETag': htmlEtag,
                            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
                        }
                    });
                }

                return new Response(htmlContent, {
                    headers: {
                        'Content-Type': 'text/html; charset=utf-8',
                        'X-Frame-Options': 'SAMEORIGIN',
                        'ETag': htmlEtag,
                        'Cache-Control': 'public, max-age=300, stale-while-revalidate=60' // 5 min cache
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
                // FIX: Check multiple variations of the recipient for security check
                const rawUsername = lookupRecipient.split('@')[0];
                const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');

                const result = await env.DB.prepare(`
                    SELECT * FROM emails 
                    WHERE id = ? 
                    AND (recipient = ? OR recipient = ? OR recipient = ?)
                `).bind(emailId, lookupRecipient, rawUsername, fullEmail).first();

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

                return cachedJsonResponse(request, {
                    from: result.sender,
                    to: result.recipient,
                    subject: decodeMimeWords(result.subject || ''),
                    'body-html': truncate(bodyHtml),
                    'body-plain': truncate(bodyText),
                    timestamp: result.received_at
                }, 200, 300); // 5 minute cache - email content is immutable
            }

            // ============================================
            // PATCH /api/email/:id/read?recipient=user@domain.com
            // Mark email as read
            // ============================================
            if (path.match(/^\/api\/email\/[^/]+\/read$/) && request.method === 'PATCH') {
                const pathParts = path.split('/');
                const emailId = pathParts[3]; // /api/email/{id}/read
                const recipient = url.searchParams.get('recipient');

                if (!recipient) {
                    return jsonResponse({ error: 'Missing recipient parameter' }, 400);
                }

                let lookupRecipient = recipient.trim();
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

                // Security: Verify email belongs to this recipient (case-insensitive)
                const rawUsername = lookupRecipient.split('@')[0];
                const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');

                const result = await env.DB.prepare(`
                    UPDATE emails 
                    SET read_at = ? 
                    WHERE id = ? 
                    AND read_at IS NULL
                    AND (recipient LIKE ? OR recipient LIKE ? OR recipient LIKE ?)
                `).bind(Date.now(), emailId, lookupRecipient, rawUsername, fullEmail).run();

                if (result.meta.changes === 0) {
                    // Check if email exists at all
                    const exists = await env.DB.prepare(`
                        SELECT id FROM emails WHERE id = ?
                    `).bind(emailId).first();

                    if (!exists) {
                        return jsonResponse({ error: 'Email not found' }, 404);
                    }
                    // Email exists but either already read or wrong recipient
                    return jsonResponse({ success: true, message: 'Already read or not authorized' });
                }

                return jsonResponse({ success: true, read_at: Date.now() });
            }

            // ============================================
            // GET /api/health
            // Health check endpoint
            // ============================================
            // ============================================
            // GET /api/debug
            // Check env vars
            // ============================================
            if (path === '/api/debug') {
                return jsonResponse({
                    EMAIL_DOMAIN: env.EMAIL_DOMAIN,
                    computedFullEmail: ('test' + '@' + (env.EMAIL_DOMAIN || 'akunlama.com')).toLowerCase()
                });
            }

            // ============================================
            // POST /api/cleanup?key=...
            // Manual cleanup trigger
            // ============================================
            if (path === '/api/cleanup' && request.method === 'POST') {
                const key = url.searchParams.get('key');
                if (key !== env.ADMIN_ACCESS_KEY) {
                    return jsonResponse({ error: 'Unauthorized' }, 403);
                }

                // Run cleanup (async to not block response if possible, 
                // but waitUntil is better for long tasks)
                if (ctx.waitUntil) {
                    ctx.waitUntil(runCleanup(env));
                    return jsonResponse({ status: 'Cleanup started in background' });
                } else {
                    const result = await runCleanup(env);
                    return jsonResponse(result);
                }
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
        ctx.waitUntil(runCleanup(env));
    }
};
