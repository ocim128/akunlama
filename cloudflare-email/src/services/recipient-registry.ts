import type { Env } from '../types/index.d.ts';

export interface RecipientCaptureOptions {
    blocked?: boolean;
    timestamp?: number;
}

/**
 * Persist a lightweight recipient record so recipients remain exportable
 * even if a message is filtered or later removed by retention cleanup.
 */
export const captureRecipient = async (
    env: Env,
    recipient: string,
    options: RecipientCaptureOptions = {}
): Promise<void> => {
    if (!recipient) {
        return;
    }

    const timestamp = options.timestamp ?? Date.now();
    const blockedCount = options.blocked ? 1 : 0;

    try {
        await env.DB.prepare(`
            INSERT INTO recipient_registry (
                recipient,
                first_seen_at,
                last_seen_at,
                total_seen_count,
                blocked_email_count
            )
            VALUES (?, ?, ?, 1, ?)
            ON CONFLICT(recipient) DO UPDATE SET
                last_seen_at = excluded.last_seen_at,
                total_seen_count = recipient_registry.total_seen_count + 1,
                blocked_email_count = recipient_registry.blocked_email_count + excluded.blocked_email_count
        `).bind(
            recipient,
            timestamp,
            timestamp,
            blockedCount
        ).run();
    } catch (error) {
        console.error(`[RECIPIENT REGISTRY] Failed to capture ${recipient}:`, error);
    }
};
