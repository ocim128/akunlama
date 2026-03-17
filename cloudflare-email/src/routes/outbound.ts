import { EmailMessage } from 'cloudflare:email';
import { jsonResponse } from '../utils/http.ts';
import type { Env } from '../types/index.d.ts';

interface OutboundEnv extends Env {
    EMAIL_DOMAIN?: string;
    OUTBOUND_EMAIL_API_KEY?: string;
    OUTBOUND_EMAIL_FROM?: string;
    OUTBOUND_EMAIL_FROM_NAME?: string;
}

interface OutboundEmailRequest {
    to?: string;
    subject?: string;
    text?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeHeader(value: string): string {
    return value.replace(/[\r\n]+/g, ' ').trim();
}

function normalizeBody(value: string): string {
    return value.replace(/\r?\n/g, '\r\n').trim();
}

function formatAddress(name: string | undefined, address: string): string {
    const safeAddress = sanitizeHeader(address);

    if (!name) {
        return `<${safeAddress}>`;
    }

    return `"${sanitizeHeader(name).replace(/"/g, "'")}" <${safeAddress}>`;
}

function buildPlainTextMessage(fromHeader: string, to: string, subject: string, text: string): string {
    return [
        `Date: ${new Date().toUTCString()}`,
        `From: ${fromHeader}`,
        `To: <${sanitizeHeader(to)}>`,
        `Subject: ${sanitizeHeader(subject)}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        normalizeBody(text),
        ''
    ].join('\r\n');
}

export async function handleOutboundPurchaseEmail(
    request: Request,
    url: URL,
    env: OutboundEnv
): Promise<Response> {
    void url;

    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const authHeader = request.headers.get('Authorization');
    const expectedHeader = env.OUTBOUND_EMAIL_API_KEY
        ? `Bearer ${env.OUTBOUND_EMAIL_API_KEY}`
        : null;

    if (!expectedHeader || authHeader !== expectedHeader) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (!env.OUTBOUND_EMAIL) {
        return jsonResponse({ error: 'Send email binding is not configured' }, 500);
    }

    let body: OutboundEmailRequest;
    try {
        body = await request.json<OutboundEmailRequest>();
    } catch {
        return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    const to = body.to?.trim().toLowerCase();
    const subject = body.subject?.trim();
    const text = body.text?.trim();

    if (!to || !EMAIL_REGEX.test(to)) {
        return jsonResponse({ error: 'Valid recipient email is required' }, 400);
    }

    if (!subject) {
        return jsonResponse({ error: 'Subject is required' }, 400);
    }

    if (!text) {
        return jsonResponse({ error: 'Text body is required' }, 400);
    }

    const fromAddress = env.OUTBOUND_EMAIL_FROM || `noreply@${env.EMAIL_DOMAIN || 'akunlama.com'}`;
    const fromHeader = formatAddress(env.OUTBOUND_EMAIL_FROM_NAME || 'AutoBeli', fromAddress);
    const rawMessage = buildPlainTextMessage(fromHeader, to, subject, text);

    try {
        await env.OUTBOUND_EMAIL.send(new EmailMessage(fromAddress, to, rawMessage));
        return jsonResponse({ success: true });
    } catch (error) {
        console.error('Failed to send outbound purchase email:', error);
        return jsonResponse({ error: 'Failed to send email' }, 500);
    }
}
