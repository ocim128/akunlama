// events.ts - /api/events route handler

import { decodeMimeWords } from '../utils/mime.ts';
import { jsonResponse, cachedJsonResponse, getClientIP } from '../utils/http.ts';
import { validateUsername, extractUsername } from '../utils/validation.ts';
import { checkRateLimit } from '../services/rate-limiter.ts';
import type { Env } from '../types/index.d.ts';

/** Extended Env with additional config */
interface EventsEnv extends Env {
    EMAIL_DOMAIN?: string;
    ADMIN_ACCESS_KEY?: string;
}

/** Email row from database */
interface EmailSummaryRow {
    id: string;
    recipient: string;
    sender: string;
    subject: string;
    preview: string | null;
    received_at: number;
    read_at: number | null;
}

/** Database query result */
interface DBResult {
    results: EmailSummaryRow[];
}

/** Handler result for internal use */
interface HandlerResult {
    success: boolean;
    result?: DBResult;
    error?: string;
    status?: number;
}

/**
 * Handle admin request for all emails
 */
async function handleAdminRequest(url: URL, env: EventsEnv): Promise<HandlerResult> {
    const adminKey = url.searchParams.get('admin_key');
    const validAdminKey = env.ADMIN_ACCESS_KEY;

    if (!validAdminKey || !adminKey || adminKey !== validAdminKey) {
        console.log('[SECURITY] Unauthorized admin access attempt');
        return { success: false, error: 'Unauthorized', status: 403 };
    }

    console.log('[ADMIN] Authorized - Fetching all emails');
    const result = await env.DB.prepare(`
        SELECT id, recipient, sender, subject, preview, received_at, read_at 
        FROM emails 
        ORDER BY received_at DESC 
        LIMIT 100
    `).all<EmailSummaryRow>();

    return { success: true, result: result as DBResult };
}

/**
 * Handle regular user request for specific recipient
 */
async function handleUserRequest(
    recipient: string,
    request: Request,
    env: EventsEnv
): Promise<HandlerResult> {
    const username = extractUsername(recipient);

    // Validate username format
    const validation = validateUsername(username, env);
    if (!validation.valid) {
        return { success: false, error: validation.error || 'Invalid username', status: 400 };
    }

    // Apply rate limiting
    const clientIP = getClientIP(request);
    const rateCheck = checkRateLimit(username, clientIP);
    if (!rateCheck.allowed) {
        console.log(`[RATE LIMIT] ${clientIP} exceeded limit for ${username}`);
        return { success: false, error: rateCheck.error || 'Rate limit exceeded', status: 429 };
    }

    // Add domain if missing
    let lookupRecipient = recipient;
    if (!lookupRecipient.includes('@')) {
        if (env.EMAIL_DOMAIN) {
            lookupRecipient = `${lookupRecipient}@${env.EMAIL_DOMAIN}`;
        } else {
            return { success: false, error: 'EMAIL_DOMAIN is not configured', status: 400 };
        }
    }

    // Query D1
    const rawUsername = lookupRecipient.split('@')[0].toLowerCase();
    const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');
    const normalizedRecipient = lookupRecipient.toLowerCase();

    // Use direct matches only - LIKE with leading wildcard causes full table scans
    const result = await env.DB.prepare(`
        SELECT id, recipient, sender, subject, preview, received_at, read_at 
        FROM emails 
        WHERE recipient = ? OR recipient = ?
        ORDER BY received_at DESC 
        LIMIT 50
    `).bind(normalizedRecipient, fullEmail).all<EmailSummaryRow>();

    return { success: true, result: result as DBResult };
}

/**
 * GET /api/events?recipient=user@domain.com
 */
export async function handleEvents(
    request: Request,
    url: URL,
    env: EventsEnv
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

    let dbResult: DBResult;

    if (isAdminRequest) {
        const adminResponse = await handleAdminRequest(url, env);
        if (!adminResponse.success) {
            return jsonResponse({ error: adminResponse.error }, adminResponse.status || 500);
        }
        dbResult = adminResponse.result!;
    } else {
        const userResponse = await handleUserRequest(trimmedRecipient, request, env);
        if (!userResponse.success) {
            return jsonResponse({ error: userResponse.error }, userResponse.status || 500);
        }
        dbResult = userResponse.result!;
    }

    // Format response like Mailgun events API
    const items = dbResult.results.map(row => ({
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
