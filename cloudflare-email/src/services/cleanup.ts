// cleanup.ts - Email cleanup service

import { EMAIL_RETENTION_MS } from '../config.ts';
import type { Env } from '../types/index.d.ts';

/** Cleanup result */
export interface CleanupResult {
    success: boolean;
    deleted?: number;
    error?: string;
}

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

    console.log('[CLEANUP] Starting cleanup...');

    try {
        // 1. Delete spam/blocked senders (aggressive)
        for (const pattern of SPAM_PATTERNS) {
            const result = await env.DB.prepare(`
                DELETE FROM emails WHERE sender LIKE ?
            `).bind(pattern).run();
            console.log(`[CLEANUP] Deleted spam pattern ${pattern}: ${result.meta.changes} rows`);
        }

        // 2. Delete old emails in batches of 1000 to avoid timeout
        do {
            const result = await env.DB.prepare(`
                DELETE FROM emails 
                WHERE id IN (
                    SELECT id FROM emails 
                    WHERE received_at < ? 
                    LIMIT 1000
                )
            `).bind(cutoffTime).run();

            deletedBatch = result.meta.changes;
            totalDeleted += deletedBatch;
            console.log(`[CLEANUP] Batch deleted: ${deletedBatch}`);

        } while (deletedBatch > 0 && totalDeleted < 20000); // Limit to 20k per run

        console.log(`[CLEANUP] Completed. Total old emails deleted: ${totalDeleted}`);
        return { success: true, deleted: totalDeleted };

    } catch (error) {
        console.error('[CLEANUP] Error:', error);
        return { success: false, error: (error as Error).message };
    }
};
