// events.ts - /api/events route handler

import { decodeMimeWords } from '../utils/mime.ts';
import { jsonResponse, cachedJsonResponse, getClientIP } from '../utils/http.ts';
import { normalizeRecipientLookup } from '../utils/validation.ts';
import { isAuthorizedAdmin } from '../utils/auth.ts';
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
async function handleAdminRequest(request: Request, url: URL, env: EventsEnv): Promise<HandlerResult> {
    if (!isAuthorizedAdmin(request, url, env)) {
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
    const lookup = normalizeRecipientLookup(recipient, env);
    if (!lookup.success) {
        return { success: false, error: lookup.error || 'Invalid username', status: 400 };
    }

    // Apply rate limiting
    const clientIP = getClientIP(request);
    const rateCheck = checkRateLimit(lookup.username, clientIP);
    if (!rateCheck.allowed) {
        console.log(`[RATE LIMIT] ${clientIP} exceeded limit for ${lookup.username}`);
        return { success: false, error: rateCheck.error || 'Rate limit exceeded', status: 429 };
    }

    const candidates = lookup.candidates;
    const placeholders = candidates.map(() => '?').join(', ');

    // Use exact matches only - LIKE with leading wildcard causes full table scans.
    const result = await env.DB.prepare(`
        SELECT id, recipient, sender, subject, preview, received_at, read_at 
        FROM emails 
        WHERE recipient IN (${placeholders})
        ORDER BY received_at DESC 
        LIMIT 50
    `).bind(...candidates).all<EmailSummaryRow>();

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
        const adminResponse = await handleAdminRequest(request, url, env);
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

    if (isAdminRequest) {
        return jsonResponse({ items }, 200, { 'Cache-Control': 'no-store' });
    }

    return cachedJsonResponse(request, { items }, 200, 15);
}
