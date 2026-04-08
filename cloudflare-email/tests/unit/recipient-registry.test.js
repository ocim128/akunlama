import { captureRecipient } from '../../src/services/recipient-registry.ts';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Recipient Registry Service', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('captures a non-blocked recipient with zero blocked count increment', async () => {
        let capturedBinds;
        const env = {
            DB: {
                prepare(sql) {
                    expect(sql).toContain('INSERT INTO recipient_registry');
                    return {
                        bind(...args) {
                            capturedBinds = args;
                            return {
                                async run() {
                                    return { meta: { changes: 1 } };
                                }
                            };
                        }
                    };
                }
            }
        };

        await captureRecipient(env, 'test@akunlama.com', { blocked: false, timestamp: 1234567890 });

        expect(capturedBinds).toEqual([
            'test@akunlama.com',
            1234567890,
            1234567890,
            0
        ]);
    });

    test('increments blocked count when recipient was filtered', async () => {
        let capturedBinds;
        const env = {
            DB: {
                prepare() {
                    return {
                        bind(...args) {
                            capturedBinds = args;
                            return {
                                async run() {
                                    return { meta: { changes: 1 } };
                                }
                            };
                        }
                    };
                }
            }
        };

        await captureRecipient(env, 'blocked@akunlama.com', { blocked: true, timestamp: 222 });

        expect(capturedBinds).toEqual([
            'blocked@akunlama.com',
            222,
            222,
            1
        ]);
    });

    test('logs and continues when registry write fails', async () => {
        const env = {
            DB: {
                prepare() {
                    return {
                        bind() {
                            return {
                                async run() {
                                    throw new Error('no such table: recipient_registry');
                                }
                            };
                        }
                    };
                }
            }
        };

        await expect(captureRecipient(env, 'fallback@akunlama.com')).resolves.toBeUndefined();
        expect(console.error).toHaveBeenCalled();
    });
});
