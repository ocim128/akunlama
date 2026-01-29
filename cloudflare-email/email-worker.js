// email-worker.js - Inbound email handler for Cloudflare Email Routing
// Parses MIME content and stores decoded text/html in D1
// Includes email filtering to block unwanted emails before storage

const MAX_BODY_LENGTH = 50000;

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

const splitHeadersAndBody = (raw) => {
    const crlfIndex = raw.indexOf('\r\n\r\n');
    if (crlfIndex !== -1) {
        return [raw.slice(0, crlfIndex), raw.slice(crlfIndex + 4)];
    }
    const lfIndex = raw.indexOf('\n\n');
    if (lfIndex !== -1) {
        return [raw.slice(0, lfIndex), raw.slice(lfIndex + 2)];
    }
    return [raw, ''];
};

const parseHeaders = (headerText) => {
    const headers = {};
    if (!headerText) {
        return headers;
    }
    const unfolded = headerText.replace(/\r?\n[ \t]+/g, ' ');
    const lines = unfolded.split(/\r?\n/);
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const name = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        if (!name) continue;
        if (headers[name]) {
            headers[name] = `${headers[name]}, ${value}`;
        } else {
            headers[name] = value;
        }
    }
    return headers;
};

const parseContentType = (value) => {
    if (!value) return { mime: 'text/plain', params: {} };
    const parts = value.split(';');
    const mime = parts.shift().trim().toLowerCase();
    const params = {};
    for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const key = part.slice(0, eq).trim().toLowerCase();
        let val = part.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        params[key] = val;
    }
    return { mime, params };
};

const decodeBytes = (bytes, charset) => {
    const cs = (charset || 'utf-8').toLowerCase();
    try {
        return new TextDecoder(cs).decode(bytes);
    } catch (err) {
        return new TextDecoder('utf-8').decode(bytes);
    }
};

const decodeBase64ToBytes = (input) => {
    const clean = input.replace(/\s+/g, '');
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
};

const decodeQuotedPrintableToBytes = (input) => {
    const cleaned = input.replace(/=\r?\n/g, '');
    const bytes = [];
    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(i + 1, i + 3))) {
            bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
            i += 2;
        } else {
            bytes.push(ch.charCodeAt(0));
        }
    }
    return new Uint8Array(bytes);
};

const decodeContent = (body, encoding, charset) => {
    const enc = (encoding || '').trim().toLowerCase();
    if (enc === 'base64') {
        return decodeBytes(decodeBase64ToBytes(body), charset);
    }
    if (enc === 'quoted-printable' || enc === 'quotedprintable') {
        return decodeBytes(decodeQuotedPrintableToBytes(body), charset);
    }
    return body;
};

const decodeMimeWords = (value) => {
    if (!value || typeof value !== 'string') return value;
    return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (match, charset, encoding, text) => {
        const enc = encoding.toUpperCase();
        if (enc === 'B') {
            return decodeBytes(decodeBase64ToBytes(text), charset);
        }
        if (enc === 'Q') {
            const qp = text.replace(/_/g, ' ');
            return decodeBytes(decodeQuotedPrintableToBytes(qp), charset);
        }
        return match;
    });
};

const parseMultipartBody = (body, boundary) => {
    if (!boundary) return { html: '', text: '' };
    const boundaryText = `--${boundary}`;
    const parts = body.split(boundaryText);
    const htmlParts = [];
    const textParts = [];

    for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        if (!part) continue;
        if (part.startsWith('--')) break;

        part = part.replace(/^\r?\n/, '');
        const [headerText, partBody] = splitHeadersAndBody(part);
        if (!partBody) continue;

        const headers = parseHeaders(headerText);
        const contentType = parseContentType(headers['content-type']);
        const encoding = headers['content-transfer-encoding'];

        if (contentType.mime.startsWith('multipart/')) {
            const nestedBoundary = contentType.params.boundary;
            if (nestedBoundary) {
                const nested = parseMultipartBody(partBody, nestedBoundary);
                if (nested.html) htmlParts.push(nested.html);
                if (nested.text) textParts.push(nested.text);
            }
            continue;
        }

        if (contentType.mime === 'text/html') {
            htmlParts.push(decodeContent(partBody, encoding, contentType.params.charset));
        } else if (contentType.mime === 'text/plain' || !contentType.mime) {
            textParts.push(decodeContent(partBody, encoding, contentType.params.charset));
        }
    }

    return {
        html: htmlParts.join('\n').trim(),
        text: textParts.join('\n').trim()
    };
};

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

const truncate = (value) => {
    if (!value) return '';
    return value.length > MAX_BODY_LENGTH ? value.slice(0, MAX_BODY_LENGTH) : value;
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

