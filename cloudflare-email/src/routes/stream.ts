// stream.ts - /api/stream SSE route handler

import { decodeMimeWords } from '../utils/mime.ts';
import { jsonResponse, getClientIP } from '../utils/http.ts';
import { normalizeRecipientLookup } from '../utils/validation.ts';
import { isAuthorizedAdmin } from '../utils/auth.ts';
import { checkRateLimit } from '../services/rate-limiter.ts';
import type { Env } from '../types/index.d.ts';

/** Extended Env with additional config */
interface StreamEnv extends Env {
    EMAIL_DOMAIN?: string;
    ADMIN_ACCESS_KEY?: string;
}

/** Execution context with waitUntil */
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

/** Email row from database */
interface EmailRow {
    id: string;
    recipient: string;
    sender: string;
    subject: string;
    received_at: number;
    read_at: number | null;
}

/** SSE event data types */
interface SSEEmailItem {
    id: string;
    timestamp: number;
    event: string;
    read_at: number | null;
    message: {
        headers: {
            from: string;
            to: string;
            subject: string;
        };
    };
    storage: { key: string };
}

/**
 * GET /api/stream?recipient=user@domain.com
 * Server-Sent Events for real-time email notifications
 * Polls D1 every 3s for ~25s, then client should reconnect
 */
export async function handleStream(
    request: Request,
    url: URL,
    env: StreamEnv,
    ctx: ExecutionContext
): Promise<Response> {
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
    let recipientCandidates: string[] = [];

    // For non-admin requests, validate username
    if (!isAdminRequest) {
        const lookup = normalizeRecipientLookup(lookupRecipient, env);
        if (!lookup.success) {
            return jsonResponse({ error: lookup.error }, 400);
        }

        // Rate limit (lighter for SSE)
        const clientIP = getClientIP(request);
        const rateCheck = checkRateLimit(lookup.username, clientIP);
        if (!rateCheck.allowed) {
            return jsonResponse({ error: rateCheck.error }, 429);
        }

        lookupRecipient = lookup.recipient;
        recipientCandidates = lookup.candidates;
    } else {
        // Admin wildcard requires key
        if (!isAuthorizedAdmin(request, url, env)) {
            return jsonResponse({ error: 'Unauthorized' }, 403);
        }
    }

    // SSE Response with streaming
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE event
    const sendEvent = async (eventType: string, data: unknown): Promise<void> => {
        const message = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
        await writer.write(encoder.encode(message));
    };

    // Start the SSE stream in background
    ctx.waitUntil((async () => {
        try {
            let lastEmailId: string | null = null;
            const pollInterval = 3000; // 3 seconds
            const maxDuration = 25000; // 25 seconds total
            const startTime = Date.now();
            const placeholders = recipientCandidates.map(() => '?').join(', ');

            // Send initial connection event
            await sendEvent('connected', { recipient: lookupRecipient, timestamp: Date.now() });

            while (Date.now() - startTime < maxDuration) {
                let result: { results: EmailRow[] };

                if (isAdminRequest) {
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at, read_at 
                        FROM emails 
                        ORDER BY received_at DESC 
                        LIMIT 20
                    `).all<EmailRow>();
                } else {
                    result = await env.DB.prepare(`
                        SELECT id, recipient, sender, subject, received_at, read_at 
                        FROM emails 
                        WHERE recipient IN (${placeholders})
                        ORDER BY received_at DESC 
                        LIMIT 20
                    `).bind(...recipientCandidates).all<EmailRow>();
                }

                const emails = result.results || [];

                // Check for new emails
                if (emails.length > 0) {
                    const newestId = emails[0].id;

                    if (lastEmailId === null) {
                        // First poll - send all current emails
                        const items: SSEEmailItem[] = emails.map(row => ({
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
                        const newEmails: SSEEmailItem[] = [];
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
                await sendEvent('error', { message: (error as Error).message });
                await writer.close();
            } catch {
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
