// stream.js - /api/stream SSE route handler

import { decodeMimeWords } from '../utils/mime.js';
import { jsonResponse, getClientIP } from '../utils/http.js';
import { validateUsername, extractUsername } from '../utils/validation.js';
import { checkRateLimit } from '../services/rate-limiter.js';

/**
 * GET /api/stream?recipient=user@domain.com
 * Server-Sent Events for real-time email notifications
 * Polls D1 every 3s for ~25s, then client should reconnect
 */
export async function handleStream(request, url, env, ctx) {
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
        const username = extractUsername(lookupRecipient);

        const validation = validateUsername(username, env);
        if (!validation.valid) {
            return jsonResponse({ error: validation.error }, 400);
        }

        // Rate limit (lighter for SSE)
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
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at, read_at 
                        FROM emails 
                        WHERE recipient = ? OR recipient = ? OR recipient LIKE ?
                        ORDER BY received_at DESC 
                        LIMIT 20
                    `).bind(normalizedRecipient, fullEmail, '%' + rawUsername + '@%').all();
                }

                const emails = result.results || [];

                // Check for new emails
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
                        // New email(s) detected
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
            'X-Accel-Buffering': 'no'
        }
    });
}
