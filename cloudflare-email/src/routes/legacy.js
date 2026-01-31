// legacy.js - Legacy endpoint handlers (/api/list, /api/getKey, /api/getHtml)
// For backward compatibility with older frontend versions

import { decodeMimeWords, decodeContent } from '../../mime-utils.js';
import { jsonResponse, cachedJsonResponse, getClientIP, generateETag } from '../utils/http.js';
import { validateUsername } from '../utils/validation.js';
import { checkRateLimit } from '../services/rate-limiter.js';

/**
 * GET /api/list?recipient=user@domain.com
 * Legacy endpoint - returns array format
 */
export async function handleList(request, url, env) {
    const recipient = url.searchParams.get('recipient');
    if (!recipient) return jsonResponse({ error: 'Missing recipient' }, 400);

    const trimmedRecipient = recipient.trim();
    const validAdminKey = env.ADMIN_ACCESS_KEY;

    // Check if this is an authorized admin request
    let isAuthorizedAdmin = false;
    let debugReason = 'User access';

    if (validAdminKey) {
        if (trimmedRecipient === validAdminKey) {
            isAuthorizedAdmin = true;
            debugReason = 'Admin key match';
        } else if (trimmedRecipient === '*' || trimmedRecipient === 'all') {
            const providedKey = url.searchParams.get('admin_key');
            if (providedKey === validAdminKey) {
                isAuthorizedAdmin = true;
                debugReason = 'Admin wildcard match';
            }
        }
    } else {
        debugReason = 'ADMIN_ACCESS_KEY not configured';
    }

    // Validate if not authorized admin
    if (!isAuthorizedAdmin) {
        const username = trimmedRecipient.split('@')[0];
        const v = validateUsername(username, env);
        if (!v.valid) return jsonResponse({ error: v.error }, 400);

        // Rate limit
        const ip = getClientIP(request);
        const rl = checkRateLimit(username, ip);
        if (!rl.allowed) return jsonResponse({ error: rl.error }, 429);
    }

    // Query DB
    let result;
    if (isAuthorizedAdmin) {
        result = await env.DB.prepare(`
            SELECT id, recipient, sender, subject, preview, received_at, read_at 
            FROM emails 
            ORDER BY received_at DESC 
            LIMIT 100
        `).all();
    } else {
        const rawUsername = trimmedRecipient.split('@')[0].toLowerCase();
        const fullEmail = rawUsername + '@' + (env.EMAIL_DOMAIN || 'akunlama.com');
        const normalizedRecipient = trimmedRecipient.toLowerCase();

        result = await env.DB.prepare(`
            SELECT id, recipient, sender, subject, preview, received_at, read_at 
            FROM emails 
            WHERE recipient = ? OR recipient = ? OR recipient LIKE ?
            ORDER BY received_at DESC 
            LIMIT 50
        `).bind(normalizedRecipient, fullEmail, '%' + rawUsername + '@%').all();
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

    return cachedJsonResponse(request, items, 200, 15);
}

/**
 * GET /api/getKey?key=...
 * Legacy endpoint for email metadata
 */
export async function handleGetKey(request, url, env) {
    const key = url.searchParams.get('key');
    if (!key) return jsonResponse({ error: 'Missing key' }, 400);

    const row = await env.DB.prepare('SELECT * FROM emails WHERE id = ?').bind(key).first();
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
export async function handleGetHtml(request, url, env) {
    const key = url.searchParams.get('key');
    if (!key) return new Response('Missing key', { status: 400 });

    const row = await env.DB.prepare('SELECT body_html, body_text FROM emails WHERE id = ?').bind(key).first();
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
