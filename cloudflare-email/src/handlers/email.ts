// email.ts - Inbound email handler

import {
    splitHeadersAndBody,
    parseHeaders,
    parseContentType,
    decodeContent,
    decodeMimeWords,
    parseMultipartBody,
    truncate,
    type MultipartResult
} from '../utils/mime.ts';
import { shouldBlockEmail } from '../services/email-filter.ts';
import type { Env, IncomingEmail } from '../types/index.d.ts';

/** Extended environment with EMAIL_DOMAIN */
interface EmailHandlerEnv extends Env {
    EMAIL_DOMAIN?: string;
}

/** Execution context with waitUntil */
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

/**
 * Extract bodies (html, text) from raw email content
 */
const extractBodiesFromRaw = (rawEmail: string): MultipartResult => {
    const [headerText, bodyText] = splitHeadersAndBody(rawEmail);
    const headers = parseHeaders(headerText);
    const contentType = parseContentType(headers['content-type']);
    const encoding = headers['content-transfer-encoding'];

    if (contentType.mime.startsWith('multipart/') && contentType.params.boundary) {
        return parseMultipartBody(bodyText, contentType.params.boundary);
    }

    const decoded = decodeContent(bodyText, encoding, contentType.params.charset);
    if (contentType.mime === 'text/html') {
        return { html: decoded, text: '' };
    }
    return { html: '', text: decoded };
};

/**
 * Email handler - processes inbound emails from Cloudflare Email Routing
 */
export async function handleEmail(
    message: IncomingEmail,
    env: EmailHandlerEnv,
    ctx: ExecutionContext
): Promise<void> {
    try {
        const rawEmail = await new Response(message.raw).text();
        const [headerText] = splitHeadersAndBody(rawEmail);
        const headers = parseHeaders(headerText);

        const subjectRaw = headers['subject'] || message.headers?.get?.('subject') || '(No Subject)';
        const subject = decodeMimeWords(subjectRaw) || '(No Subject)';
        const sender = headers['from'] || message.from;

        // Extract clean email address from "To" header
        const rawTo = headers['to'] || message.to;
        let recipient = rawTo;
        const emailMatch = rawTo.match(/<([^>]+)>/);
        if (emailMatch) {
            recipient = emailMatch[1];
        } else if (rawTo.includes('@')) {
            recipient = rawTo.trim();
        }
        // Normalize to lowercase
        recipient = recipient.toLowerCase();

        const { html, text } = extractBodiesFromRaw(rawEmail);

        // EMAIL FILTERING - Block unwanted emails before storage
        const filterResult = shouldBlockEmail(sender, subject, text || html, env as unknown as Record<string, unknown>);
        if (filterResult.blocked) {
            console.log(`[FILTER] Email blocked for ${recipient}: ${filterResult.reason}`);
            return; // Don't store - saves D1 quota
        }

        const emailId = crypto.randomUUID();

        // Generate preview from text (first 100 chars)
        const previewText = (text || html || '')
            .replace(/<[^>]*>/g, '') // Strip HTML tags
            .replace(/\s+/g, ' ')    // Normalize whitespace
            .trim()
            .substring(0, 100);

        await env.DB.prepare(`
            INSERT INTO emails (id, recipient, sender, subject, body_html, body_text, preview, received_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
            emailId,
            recipient,
            sender,
            subject,
            truncate(html),
            truncate(text),
            previewText || null,
            Date.now()
        ).run();

        console.log(`Email stored: ${emailId} for ${recipient}`);

    } catch (error) {
        console.error('Error processing email:', error);
    }
}
