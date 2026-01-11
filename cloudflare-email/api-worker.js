// api-worker.js - API to fetch emails (replaces Mailgun)
// Admin access requires both wildcard recipient AND valid admin_key

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

                let result;

                // Check for admin access (wildcard)
                const isAdminRequest = recipient === '*' || recipient === 'all';

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
          `).bind(recipient).all();
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
                            subject: row.subject
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

                return new Response(JSON.stringify({
                    from: result.sender,
                    to: result.recipient,
                    subject: result.subject,
                    'body-html': result.body_html,
                    'body-plain': result.body_text,
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
    }
}
