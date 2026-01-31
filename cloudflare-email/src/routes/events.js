// events.js - /api/events route handler

import { decodeMimeWords } from '../../mime-utils.js';
import { jsonResponse, cachedJsonResponse, getClientIP } from '../utils/http.js';
import { validateUsername, extractUsername } from '../utils/validation.js';
import { checkRateLimit } from '../services/rate-limiter.js';

/**
 * GET /api/events?recipient=user@domain.com
 * Returns list of emails for a recipient (Mailgun-compatible format)
 * Admin access: recipient=* AND admin_key=<secret>
 */
export async function handleEvents(request, url, env) {
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
        const username = extractUsername(lookupRecipient);

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

        console.log('[ADMIN] Authorized - Fetching all emails');
        result = await env.DB.prepare(`
            SELECT id, recipient, sender, subject, preview, received_at, read_at 
            FROM emails 
            ORDER BY received_at DESC 
            LIMIT 100
        `).all();
    } else {
        // Regular user access - case-insensitive matching
        const rawUsername = lookupRecipient.split('@')[0].toLowerCase();
        const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');
        const normalizedRecipient = lookupRecipient.toLowerCase();

        // Use direct matches only - LIKE with leading wildcard causes full table scans
        result = await env.DB.prepare(`
            SELECT id, recipient, sender, subject, preview, received_at, read_at 
            FROM emails 
            WHERE recipient = ? OR recipient = ?
            ORDER BY received_at DESC 
            LIMIT 50
        `).bind(normalizedRecipient, fullEmail).all();
    }

    // Format response like Mailgun events API
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
