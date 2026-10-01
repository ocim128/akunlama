// cleanup.ts - Email cleanup service

import { EMAIL_RETENTION_MS } from '../config.ts';
import type { Env } from '../types/index.d.ts';

/** Cleanup result */
export interface CleanupResult {
    success: boolean;
    completed: boolean;
    stop_reason: 'exhausted' | 'batch_limit' | 'runtime_limit' | 'error';
    batches: number;
    duration_ms: number;
    deleted?: number;
    error?: string;
}

export const OLD_EMAIL_BATCH_SIZE = 10000;
export const MAX_OLD_EMAIL_BATCHES_PER_RUN = 30;
export const MAX_CLEANUP_RUNTIME_MS = 25000;

// Spam patterns to delete aggressively
const SPAM_PATTERNS: string[] = [
    '%registration@facebook.com%',
    '%registration@facebookmail.com%',
    '%friendsuggestion@facebookmail.com%',
    '%reminders@facebookmail.com%',
    '%groupupdates@facebookmail.com%',
    '%pageupdates@facebookmail.com%',
    '%notification@facebookmail.com%',
    '%friendupdates@facebookmail.com%',
    '%friends@facebookmail.com%',
    '%close_friend_updates@facebookmail.com%',
    '%posts-recaps@mail.instagram.com%'
];

/**
 * Run cleanup to delete old emails and spam
 */
export const runCleanup = async (env: Env): Promise<CleanupResult> => {
    const cutoffTime = Date.now() - EMAIL_RETENTION_MS;
    let totalDeleted = 0;
    let deletedBatch = 0;
    let batchCount = 0;
    const cleanupStartedAt = Date.now();
    let stopReason: CleanupResult['stop_reason'] = 'exhausted';
    let errorMessage: string | undefined;

    try {
        // 1. Delete spam/blocked senders (aggressive)
        const spamResult = await env.DB.prepare(`
            DELETE FROM emails WHERE ${SPAM_PATTERNS.map(() => 'sender LIKE ?').join(' OR ')}
        `).bind(...SPAM_PATTERNS).run();
        totalDeleted += spamResult.meta.changes || 0;

        // 2. Delete old emails in batches until caught up or runtime budget is reached.
        do {
            if (batchCount >= MAX_OLD_EMAIL_BATCHES_PER_RUN) {
                stopReason = 'batch_limit';
                break;
            }

            if (Date.now() - cleanupStartedAt >= MAX_CLEANUP_RUNTIME_MS) {
                stopReason = 'runtime_limit';
                break;
            }

            const result = await env.DB.prepare(`
                DELETE FROM emails 
                WHERE id IN (
                    SELECT id FROM emails 
                    WHERE received_at < ? 
                    LIMIT ${OLD_EMAIL_BATCH_SIZE}
                )
            `).bind(cutoffTime).run();

            deletedBatch = result.meta.changes || 0;
            totalDeleted += deletedBatch;
            batchCount += 1;
        } while (deletedBatch > 0);
    } catch (error) {
        stopReason = 'error';
        errorMessage = (error as Error).message;
    }

    const result: CleanupResult = {
        success: stopReason !== 'error',
        completed: stopReason === 'exhausted',
        stop_reason: stopReason,
        deleted: totalDeleted,
        batches: batchCount,
        duration_ms: Date.now() - cleanupStartedAt,
        ...(errorMessage ? { error: errorMessage } : {})
    };
    const summary = JSON.stringify({ event: 'cleanup', ...result });
    if (!result.success) console.error(summary);
    else if (!result.completed) console.warn(summary);
    else console.log(summary);
    return result;
};
