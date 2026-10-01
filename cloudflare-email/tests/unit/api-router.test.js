import { describe, test, expect, vi, afterEach } from 'vitest';
import { handleFetch } from '../../src/handlers/api.ts';
import { handleEvents } from '../../src/routes/events.ts';
import { handleGetEmail, handleMarkRead } from '../../src/routes/email-content.ts';

vi.mock('../../src/routes/events.ts', () => ({ handleEvents: vi.fn() }));
vi.mock('../../src/routes/email-content.ts', () => ({ handleGetEmail: vi.fn(), handleMarkRead: vi.fn() }));
vi.mock('../../src/routes/outbound.ts', () => ({ handleOutboundPurchaseEmail: vi.fn() }));

afterEach(() => vi.restoreAllMocks());

describe('API error boundary', () => {
    test.each([
        ['GET', '/api/events', handleEvents],
        ['GET', '/api/email/email-1', handleGetEmail],
        ['PATCH', '/api/email/email-1/read', handleMarkRead]
    ])('returns a safe JSON error when %s %s rejects', async (method, path, handler) => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        handler.mockRejectedValueOnce(new Error('private database details'));

        const response = await handleFetch(new Request(`https://example.com${path}`, { method }), {}, {});

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({ error: 'Internal server error' });
        expect(console.error).toHaveBeenCalledWith('API Error:', expect.any(Error));
    });
});
