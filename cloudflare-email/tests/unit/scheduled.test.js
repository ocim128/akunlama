import { describe, test, expect, vi, afterEach } from 'vitest';
import { handleScheduled } from '../../src/handlers/scheduled.ts';

afterEach(() => vi.restoreAllMocks());

describe('Scheduled cleanup outcome', () => {
    test('rejects background work when retention cleanup fails', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'log').mockImplementation(() => {});
        let outcome;
        const ctx = { waitUntil(promise) { outcome = promise.then(() => null, error => error); } };

        await handleScheduled({}, { DB: { prepare() { throw new Error('DB unavailable'); } } }, ctx);

        expect(await outcome).toEqual(new Error('DB unavailable'));
    });
});
