// email-content.ts - /api/email/:id route handlers

import {
    decodeMimeWords,
    parseMultipartBody,
    truncate
} from '../utils/mime.ts';
import { jsonResponse, cachedJsonResponse } from '../utils/http.ts';
import { normalizeRecipientLookup } from '../utils/validation.ts';
import type { Env } from '../types/index.d.ts';

/** Extended Env with EMAIL_DOMAIN */
interface EmailEnv extends Env {
    EMAIL_DOMAIN?: string;
}

/** Email row from database */
interface EmailRow {
    id: string;
    sender: string;
    recipient: string;
    subject: string;
    body_html: string | null;
    body_text: string | null;
    received_at: number;
}

/**
 * Detect boundary in multipart body text
 */
const detectBoundary = (body: string | null): string => {
    if (!body) return '';
    const direct = body.match(/^\s*--([^\r\n]+)/);
    if (direct) return direct[1].trim();
    const indirect = body.match(/\r?\n--([^\r\n]+)/);
    return indirect ? indirect[1].trim() : '';
};

/**
 * Extract bodies from stored text
 */
const extractBodiesFromStoredText = (bodyText: string | null): { html: string; text: string } => {
    if (!bodyText) return { html: '', text: '' };
    const boundary = detectBoundary(bodyText);
    if (!boundary) {
        return { html: '', text: bodyText.trim() };
    }
    return parseMultipartBody(bodyText, boundary);
};

/**
 * GET /api/email/:id?recipient=user@domain.com
 * Returns full email content
 */
export async function handleGetEmail(
    request: Request,
    url: URL,
    emailId: string,
    env: EmailEnv
): Promise<Response> {
    const recipient = url.searchParams.get('recipient');

    if (!recipient) {
        return jsonResponse({ error: 'Missing recipient parameter' }, 400);
    }

    const lookup = normalizeRecipientLookup(recipient, env);
    if (!lookup.success) {
        return jsonResponse({ error: lookup.error }, 400);
    }

    const candidates = lookup.candidates;
    const placeholders = candidates.map(() => '?').join(', ');

    const result = await env.DB.prepare(`
        SELECT id, sender, recipient, subject, body_html, body_text, received_at
        FROM emails
        WHERE id = ? 
        AND recipient IN (${placeholders})
    `).bind(emailId, ...candidates).first<EmailRow>();

    if (!result) {
        return jsonResponse({ error: 'Email not found' }, 404);
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

    return cachedJsonResponse(request, {
        from: result.sender,
        to: result.recipient,
        subject: decodeMimeWords(result.subject || ''),
        'body-html': truncate(bodyHtml),
        'body-plain': truncate(bodyText),
        timestamp: result.received_at
    }, 200, 300); // 5 minute cache - email content is immutable
}

/**
 * PATCH /api/email/:id/read?recipient=user@domain.com
 * Mark email as read
 */
export async function handleMarkRead(
    request: Request,
    url: URL,
    emailId: string,
    env: EmailEnv
): Promise<Response> {
    const recipient = url.searchParams.get('recipient');

    if (!recipient) {
        return jsonResponse({ error: 'Missing recipient parameter' }, 400);
    }

    const lookup = normalizeRecipientLookup(recipient, env);
    if (!lookup.success) {
        return jsonResponse({ error: lookup.error }, 400);
    }

    const candidates = lookup.candidates;
    const placeholders = candidates.map(() => '?').join(', ');
    const readAt = Date.now();

    const result = await env.DB.prepare(`
        UPDATE emails 
        SET read_at = ? 
        WHERE id = ? 
        AND read_at IS NULL
        AND recipient IN (${placeholders})
    `).bind(readAt, emailId, ...candidates).run();

    if (result.meta.changes === 0) {
        const exists = await env.DB.prepare(`
            SELECT id FROM emails WHERE id = ?
        `).bind(emailId).first();

        if (!exists) {
            return jsonResponse({ error: 'Email not found' }, 404);
        }
        return jsonResponse({ success: true, message: 'Already read or not authorized' });
    }

    return jsonResponse({ success: true, read_at: readAt });
}
