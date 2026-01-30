// api-worker.js - API to fetch emails (replaces Mailgun)
// Admin access requires both wildcard recipient AND valid admin_key
// Includes scheduled cleanup of old emails (7-day retention)

import {
    splitHeadersAndBody,
    parseHeaders,
    parseContentType,
    decodeContent,
    decodeMimeWords,
    parseMultipartBody,
    truncate
} from './mime-utils.js';

// Email retention period: 7 days in milliseconds
const EMAIL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

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

            // GET /api/email/:id?recipient=user@domain.com
            // Security: Requires both email ID AND matching recipient
            if (path.startsWith('/api/email/')) {
                const emailId = path.replace('/api/email/', '');
                const recipient = url.searchParams.get('recipient');

                // Require recipient parameter for compound key validation
                if (!recipient) {
                    return new Response(JSON.stringify({ error: 'Missing recipient parameter' }), {
                        status: 400, headers
                    });
                }

                // Normalize recipient (add domain if missing)
                let lookupRecipient = recipient.trim();
                if (!lookupRecipient.includes('@')) {
                    if (env.EMAIL_DOMAIN) {
                        lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
                    } else {
                        return new Response(JSON.stringify({ error: 'EMAIL_DOMAIN is not configured' }), {
                            status: 400, headers
                        });
                    }
                }

                // Validate both ID AND recipient match (compound key security)
                const result = await env.DB.prepare(`
                    SELECT * FROM emails WHERE id = ? AND recipient = ?
                `).bind(emailId, lookupRecipient).first();

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
