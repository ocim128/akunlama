// cleanup.ts - Email cleanup service

import { EMAIL_RETENTION_MS } from '../config.ts';
import type { Env } from '../types/index.d.ts';

/** Cleanup result */
export interface CleanupResult {
    success: boolean;
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

    console.log('[CLEANUP] Starting cleanup...');

    try {
        // 1. Delete spam/blocked senders (aggressive)
        for (const pattern of SPAM_PATTERNS) {
            const result = await env.DB.prepare(`
                DELETE FROM emails WHERE sender LIKE ?
            `).bind(pattern).run();
            const deletedSpam = result.meta.changes || 0;
            totalDeleted += deletedSpam;
            console.log(`[CLEANUP] Deleted spam pattern ${pattern}: ${deletedSpam} rows`);
        }

        // 2. Delete old emails in batches until caught up or runtime budget is reached.
        do {
            if (batchCount >= MAX_OLD_EMAIL_BATCHES_PER_RUN) {
                console.warn(`[CLEANUP] Stopping after ${batchCount} batches to stay within per-run delete budget.`);
                break;
            }

            if (Date.now() - cleanupStartedAt >= MAX_CLEANUP_RUNTIME_MS) {
                console.warn('[CLEANUP] Stopping early to stay within runtime budget.');
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
            console.log(`[CLEANUP] Old-email batch ${batchCount}: ${deletedBatch} rows`);

        } while (deletedBatch > 0);

        console.log(`[CLEANUP] Completed. Total rows deleted: ${totalDeleted}`);
        return { success: true, deleted: totalDeleted };

    } catch (error) {
        console.error('[CLEANUP] Error:', error);
        return { success: false, error: (error as Error).message };
    }
};
