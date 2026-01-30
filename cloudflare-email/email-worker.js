// email-worker.js - Inbound email handler for Cloudflare Email Routing
// Parses MIME content and stores decoded text/html in D1
// Includes email filtering to block unwanted emails before storage

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

export default {
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

            // ============================================
            // EMAIL FILTERING - Block unwanted emails before storage
            // ============================================
            const filterResult = shouldBlockEmail(sender, subject, text || html, env);
            if (filterResult.blocked) {
                console.log(`[FILTER] Email blocked for ${recipient}: ${filterResult.reason}`);
                return; // Don't store - saves D1 quota
            }
            // ============================================

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
    }
};
