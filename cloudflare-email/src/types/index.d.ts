/**
 * Shared type definitions for Akunlama Email Worker
 */

/** Email message stored in D1 database */
export interface StoredEmail {
    id: string;
    mailbox: string;
    from_address: string;
    to_address: string;
    subject: string;
    received_at: string;
    raw_email: string;
    size_bytes: number;
}

/** Parsed MIME message structure */
export interface MimeMessage {
    headers: Record<string, string>;
    subject: string;
    from: string;
    to: string;
    date: string;
    messageId: string;
    textBody: string | null;
    htmlBody: string | null;
    attachments: MimeAttachment[];
}

/** Email attachment */
export interface MimeAttachment {
    filename: string;
    contentType: string;
    size: number;
    content: string;
    contentId?: string;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

/** Email list item (summary without body) */
export interface EmailListItem {
    id: string;
    from: string;
    subject: string;
    received_at: string;
    size_bytes: number;
}

/** Rate limiter entry */
export interface RateLimitEntry {
    count: number;
    resetAt: number;
}

/** Environment bindings for Cloudflare Worker */
export interface Env {
    DB: D1Database;
    RATE_LIMIT_KV: KVNamespace;
    ALLOWED_DOMAINS: string;
    ADMIN_KEY?: string;
    MAX_EMAIL_SIZE?: string;
    RATE_LIMIT_MAX?: string;
    RATE_LIMIT_WINDOW?: string;
}

/** Cloudflare Email message (incoming) */
export interface IncomingEmail {
    from: string;
    to: string;
    raw: ReadableStream<Uint8Array>;
    rawSize: number;
    headers: Headers;
    forward(to: string): Promise<void>;
    reply(message: EmailMessage): Promise<void>;
    setReject(reason: string): void;
}

/** Email message for replies */
export interface EmailMessage {
    from: string;
    to: string;
    subject: string;
    content: string;
}
