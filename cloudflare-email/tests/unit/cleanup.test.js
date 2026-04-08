import {
    runCleanup,
    OLD_EMAIL_BATCH_SIZE,
    MAX_OLD_EMAIL_BATCHES_PER_RUN
} from '../../src/services/cleanup.ts';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const SPAM_PATTERN_COUNT = 11;

function createEnv(oldEmailDeletes, spamDeleteCount = 0) {
    let oldEmailIndex = 0;
    let oldEmailCalls = 0;
    let spamCalls = 0;

    return {
        env: {
            DB: {
                prepare(sql) {
                    return {
                        bind() {
                            return {
                                async run() {
                                    if (sql.includes('sender LIKE')) {
                                        spamCalls += 1;
                                        return { meta: { changes: spamDeleteCount } };
                                    }

                                    if (sql.includes('received_at < ?')) {
                                        const changes = oldEmailDeletes[oldEmailIndex] ?? 0;
                                        oldEmailIndex += 1;
                                        oldEmailCalls += 1;
                                        return { meta: { changes } };
                                    }

                                    throw new Error(`Unexpected SQL: ${sql}`);
                                }
                            };
                        }
                    };
                }
            }
        },
        getStats() {
            return { oldEmailCalls, spamCalls };
        }
    };
}

describe('Cleanup Service', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('deletes spam matches and batches old emails until exhausted', async () => {
        const { env, getStats } = createEnv([OLD_EMAIL_BATCH_SIZE, OLD_EMAIL_BATCH_SIZE, 2500, 0], 2);

        const result = await runCleanup(env);

        expect(result).toEqual({
            success: true,
            deleted: (SPAM_PATTERN_COUNT * 2) + (OLD_EMAIL_BATCH_SIZE * 2) + 2500
        });
        expect(getStats()).toEqual({
            spamCalls: SPAM_PATTERN_COUNT,
            oldEmailCalls: 4
        });
    });

    test('stops after the configured old-email batch cap', async () => {
        const batches = Array(MAX_OLD_EMAIL_BATCHES_PER_RUN + 5).fill(OLD_EMAIL_BATCH_SIZE);
        const { env, getStats } = createEnv(batches, 0);

        const result = await runCleanup(env);

        expect(result).toEqual({
            success: true,
            deleted: MAX_OLD_EMAIL_BATCHES_PER_RUN * OLD_EMAIL_BATCH_SIZE
        });
        expect(getStats()).toEqual({
            spamCalls: SPAM_PATTERN_COUNT,
            oldEmailCalls: MAX_OLD_EMAIL_BATCHES_PER_RUN
        });
        expect(console.warn).toHaveBeenCalled();
    });
});
