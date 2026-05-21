// legacy.ts - Legacy endpoint handlers (/api/list, /api/getKey, /api/getHtml)
// For backward compatibility with older frontend versions

import { decodeMimeWords, decodeContent } from '../utils/mime.ts';
import { jsonResponse, cachedJsonResponse, getClientIP, generateETag } from '../utils/http.ts';
import { normalizeRecipientLookup } from '../utils/validation.ts';
import { isAuthorizedAdmin as isAuthorizedAdminRequest } from '../utils/auth.ts';
import { checkRateLimit } from '../services/rate-limiter.ts';
import type { Env } from '../types/index.d.ts';

/** Extended Env with additional config */
interface LegacyEnv extends Env {
    EMAIL_DOMAIN?: string;
    ADMIN_ACCESS_KEY?: string;
}

/** Email summary row from database */
interface EmailSummaryRow {
    id: string;
    recipient: string;
    sender: string;
    subject: string;
    preview: string | null;
    received_at: number;
    read_at: number | null;
}

/** Full email row from database */
interface FullEmailRow {
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    body_html: string | null;
    body_text: string | null;
    received_at: number;
}

/**
 * GET /api/list?recipient=user@domain.com
 * Legacy endpoint - returns array format
 */
export async function handleList(
    request: Request,
    url: URL,
    env: LegacyEnv
): Promise<Response> {
    const recipient = url.searchParams.get('recipient');
    if (!recipient) return jsonResponse({ error: 'Missing recipient' }, 400);

    const trimmedRecipient = recipient.trim();
    // Check if this is an authorized admin request
    let authorizedAdmin = false;
    const isWildcardAdminRequest = trimmedRecipient === '*' || trimmedRecipient === 'all';

    if (env.ADMIN_ACCESS_KEY && trimmedRecipient === env.ADMIN_ACCESS_KEY) {
        console.warn('[SECURITY] Legacy admin key in recipient parameter used; prefer Authorization: Bearer.');
        authorizedAdmin = true;
    } else if (isWildcardAdminRequest) {
        authorizedAdmin = isAuthorizedAdminRequest(request, url, env);
        if (!authorizedAdmin) {
            return jsonResponse({ error: 'Unauthorized' }, 403);
        }
    }

    // Validate if not authorized admin
    let userCandidates: string[] = [];
    if (!authorizedAdmin) {
        const userLookup = normalizeRecipientLookup(trimmedRecipient, env);
        if (!userLookup.success) return jsonResponse({ error: userLookup.error }, 400);

        // Rate limit
        const ip = getClientIP(request);
        const rl = checkRateLimit(userLookup.username, ip);
        if (!rl.allowed) return jsonResponse({ error: rl.error }, 429);
        userCandidates = userLookup.candidates;
    }

    // Query DB
    let result: { results: EmailSummaryRow[] };
    if (authorizedAdmin) {
        result = await env.DB.prepare(`
            SELECT id, recipient, sender, subject, preview, received_at, read_at 
            FROM emails 
            ORDER BY received_at DESC 
            LIMIT 100
        `).all<EmailSummaryRow>();
    } else {
        const candidates = userCandidates;
        const placeholders = candidates.map(() => '?').join(', ');

        // Use exact matches only - LIKE with leading wildcard causes full table scans.
        result = await env.DB.prepare(`
            SELECT id, recipient, sender, subject, preview, received_at, read_at 
            FROM emails 
            WHERE recipient IN (${placeholders})
            ORDER BY received_at DESC 
            LIMIT 50
        `).bind(...candidates).all<EmailSummaryRow>();
    }

    // Format as array of messages
    const items = result.results.map(row => ({
        url: `/api/list?recipient=${row.recipient}`,
        timestamp: row.received_at / 1000,
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
            region: 'us'
        }
    }));

    if (authorizedAdmin) {
        return jsonResponse(items, 200, { 'Cache-Control': 'no-store' });
    }

    return cachedJsonResponse(request, items, 200, 15);
}

/**
 * GET /api/getKey?key=...
 * Legacy endpoint for email metadata
 */
export async function handleGetKey(
    request: Request,
    url: URL,
    env: LegacyEnv
): Promise<Response> {
    const key = url.searchParams.get('key');
    if (!key) return jsonResponse({ error: 'Missing key' }, 400);

    const row = await env.DB.prepare(`
        SELECT id, sender, recipient, subject, received_at
        FROM emails
        WHERE id = ?
    `)
        .bind(key)
        .first<FullEmailRow>();
    if (!row) return jsonResponse({ error: 'Not found' }, 404);

    // Extract name/email from sender
    const fromRaw = row.sender || '';
    const nameMatch = fromRaw.match(/^"?(.*?)"?\s*</);
    const emailMatch = fromRaw.match(/<(.+)>/);
    const name = nameMatch ? nameMatch[1] : (fromRaw.split('<')[0].trim() || 'Unknown');
    const emailAddress = emailMatch ? emailMatch[1] : (fromRaw || 'Unknown');

    return cachedJsonResponse(request, {
        subject: decodeMimeWords(row.subject || ''),
        name: name,
        emailAddress: emailAddress,
        recipients: row.recipient,
        Date: new Date(row.received_at).toISOString()
    }, 200, 60);
}

/**
 * GET /api/getHtml?key=...
 * Legacy endpoint for HTML content
 */
export async function handleGetHtml(
    request: Request,
    url: URL,
    env: LegacyEnv
): Promise<Response> {
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });

    const row = await env.DB.prepare('SELECT body_html, body_text FROM emails WHERE id = ?')
        .bind(key)
        .first<{ body_html: string | null; body_text: string | null }>();
    if (!row) return new Response('Not found', { status: 404 });

    let html = row.body_html;
    if (!html && row.body_text) {
        let text = row.body_text;

        // Heuristic: if text contains QP artifacts, try to decode
        if (text.includes('=\r\n') || text.includes('=\n') || text.includes('=3D')) {
            try {
                text = decodeContent(text, 'quoted-printable', 'utf-8');
            } catch (e) {
                console.warn('[getHtml] Failed to decode QP:', e);
            }
        }

        // Heuristic: if it looks like HTML, treat as HTML
        if (text.trim().startsWith('<') || text.includes('</')) {
            html = text;
        } else {
            html = `<div style="font-family: system-ui, -apple-system, sans-serif; padding: 20px; line-height: 1.5; text-wrap: pretty; color: #374151;">${text.replace(/\n/g, '<br>')}</div>`;
        }
    }

    // Generate ETag for HTML content
    const htmlContent = html || '';
    const htmlEtag = generateETag(htmlContent);
    const ifNoneMatch = request.headers.get('If-None-Match');

    if (ifNoneMatch && ifNoneMatch === htmlEtag) {
        return new Response(null, {
            status: 304,
            headers: {
                'ETag': htmlEtag,
                'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
            }
        });
    }

    return new Response(htmlContent, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'X-Frame-Options': 'SAMEORIGIN',
            'ETag': htmlEtag,
            'Cache-Control': 'public, max-age=300, stale-while-revalidate=60'
        }
    });
}
