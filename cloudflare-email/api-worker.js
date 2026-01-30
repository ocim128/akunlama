// api-worker.js - API to fetch emails (replaces Mailgun)
// Admin access requires both wildcard recipient AND valid admin_key
// Includes scheduled cleanup of old emails (7-day retention)

const MAX_BODY_LENGTH = 50000;

// Email retention period: 7 days in milliseconds
const EMAIL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

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

const detectBoundary = (body) => {
    if (!body) return '';
    const direct = body.match(/^\s*--([^\r\n]+)/);
    if (direct) return direct[1].trim();
    const indirect = body.match(/\r?\n--([^\r\n]+)/);
    return indirect ? indirect[1].trim() : '';
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

const extractBodiesFromStoredText = (bodyText) => {
    if (!bodyText) return { html: '', text: '' };
    const boundary = detectBoundary(bodyText);
    if (!boundary) {
        return { html: '', text: bodyText.trim() };
    }
    return parseMultipartBody(bodyText, boundary);
};

const truncate = (value) => {
    if (!value) return '';
    return value.length > MAX_BODY_LENGTH ? value.slice(0, MAX_BODY_LENGTH) : value;
};

export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;

        // CORS headers
        const headers = {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
        };

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers });
        }

        try {
            // GET /api/events?recipient=user@domain.com
            // Admin access: recipient=* AND admin_key=<secret> returns ALL emails
            if (path === '/api/events') {
                const recipient = url.searchParams.get('recipient');
                if (!recipient) {
                    return new Response(JSON.stringify({ error: 'Missing recipient parameter' }), {
                        status: 400, headers
                    });
                }

                const trimmedRecipient = recipient.trim();
                if (!trimmedRecipient) {
                    return new Response(JSON.stringify({ error: 'Missing recipient parameter' }), {
                        status: 400, headers
                    });
                }

                let result;

                // Check for admin access (wildcard)
                const isAdminRequest = trimmedRecipient === '*' || trimmedRecipient === 'all';
                let lookupRecipient = trimmedRecipient;

                if (!isAdminRequest && !lookupRecipient.includes('@')) {
                    if (env.EMAIL_DOMAIN) {
                        lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
                    } else {
                        return new Response(JSON.stringify({ error: 'EMAIL_DOMAIN is not configured' }), {
                            status: 400, headers
                        });
                    }
                }

                if (isAdminRequest) {
                    // SECURITY: Admin access requires valid admin_key
                    const adminKey = url.searchParams.get('admin_key');
                    const validAdminKey = env.ADMIN_ACCESS_KEY; // Set this in Cloudflare Worker secrets

                    if (!validAdminKey || !adminKey || adminKey !== validAdminKey) {
                        console.log('[SECURITY] Unauthorized admin access attempt');
                        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                            status: 403, headers
                        });
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

                // Format response like Mailgun events API
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

                return new Response(JSON.stringify({ items }), { headers });
            }

            // GET /api/email/:id
            if (path.startsWith('/api/email/')) {
                const emailId = path.replace('/api/email/', '');

                const result = await env.DB.prepare(`
          SELECT * FROM emails WHERE id = ?
        `).bind(emailId).first();

                if (!result) {
                    return new Response(JSON.stringify({ error: 'Email not found' }), {
                        status: 404, headers
                    });
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

                return new Response(JSON.stringify({
                    from: result.sender,
                    to: result.recipient,
                    subject: decodeMimeWords(result.subject || ''),
                    'body-html': truncate(bodyHtml),
                    'body-plain': truncate(bodyText),
                    timestamp: result.received_at
                }), { headers });
            }

            // Health check
            if (path === '/api/health') {
                return new Response(JSON.stringify({ status: 'ok' }), { headers });
            }

            return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers });

        } catch (error) {
            console.error('API Error:', error);
            return new Response(JSON.stringify({ error: 'Internal server error' }), {
                status: 500, headers
            });
        }
    },

    // Scheduled cron handler - runs daily to clean up old emails
    // Configure in wrangler.toml or Cloudflare Dashboard:
    // [triggers]
    // crons = ["0 0 * * *"]  # Runs at midnight UTC daily
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
}

