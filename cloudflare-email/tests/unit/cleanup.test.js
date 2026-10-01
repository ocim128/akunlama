import {
    runCleanup,
    OLD_EMAIL_BATCH_SIZE,
    MAX_OLD_EMAIL_BATCHES_PER_RUN,
    MAX_CLEANUP_RUNTIME_MS
} from '../../src/services/cleanup.ts';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

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

        expect(result).toMatchObject({
            success: true,
            completed: true,
            stop_reason: 'exhausted',
            batches: 4,
            deleted: 2 + (OLD_EMAIL_BATCH_SIZE * 2) + 2500
        });
        expect(getStats()).toEqual({
            spamCalls: 1,
            oldEmailCalls: 4
        });
    });

    test('stops after the configured old-email batch cap', async () => {
        const batches = Array(MAX_OLD_EMAIL_BATCHES_PER_RUN + 5).fill(OLD_EMAIL_BATCH_SIZE);
        const { env, getStats } = createEnv(batches, 0);

        const result = await runCleanup(env);

        expect(result).toMatchObject({
            success: true,
            completed: false,
            stop_reason: 'batch_limit',
            deleted: MAX_OLD_EMAIL_BATCHES_PER_RUN * OLD_EMAIL_BATCH_SIZE
        });
        expect(getStats()).toEqual({
            spamCalls: 1,
            oldEmailCalls: MAX_OLD_EMAIL_BATCHES_PER_RUN
        });
        expect(console.warn).toHaveBeenCalled();
    });

    test('reports when spam cleanup consumes the retention runtime budget', async () => {
        const { env, getStats } = createEnv([OLD_EMAIL_BATCH_SIZE], 2);
        vi.spyOn(Date, 'now').mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValue(MAX_CLEANUP_RUNTIME_MS);

        expect(await runCleanup(env)).toMatchObject({
            success: true, completed: false, stop_reason: 'runtime_limit',
            deleted: 2, batches: 0, duration_ms: MAX_CLEANUP_RUNTIME_MS
        });
        expect(getStats()).toEqual({ spamCalls: 1, oldEmailCalls: 0 });
    });

    test('binds all existing spam patterns in one deletion', async () => {
        const { env } = createEnv([0]);
        const bind = vi.fn().mockReturnValue({ run: async () => ({ meta: { changes: 0 } }) });
        const prepare = vi.spyOn(env.DB, 'prepare');
        prepare.mockReturnValueOnce({ bind });
        await runCleanup(env);

        const spamQuery = prepare.mock.calls[0][0];
        expect(spamQuery.match(/sender LIKE \?/g)).toHaveLength(11);
        expect(spamQuery.match(/ OR /g)).toHaveLength(10);
        expect(bind).toHaveBeenCalledWith(
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
        );
    });

    test('reports a database failure instead of claiming completion', async () => {
        const env = { DB: { prepare() { throw new Error('DB unavailable'); } } };

        expect(await runCleanup(env)).toMatchObject({
            success: false, completed: false, stop_reason: 'error', error: 'DB unavailable'
        });
        const summary = JSON.parse(console.error.mock.calls.at(-1)[0]);
        expect(summary).toMatchObject({ event: 'cleanup', success: false, stop_reason: 'error' });
    });
});
