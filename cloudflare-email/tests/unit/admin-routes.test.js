import { handleEvents } from '../../src/routes/events.ts';
import { handleList } from '../../src/routes/legacy.ts';
import { handleDebug } from '../../src/routes/admin.ts';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

const emailRows = [
    {
        id: 'email-1',
        recipient: 'user@akunlama.com',
        sender: 'sender@example.com',
        subject: 'Hello',
        preview: 'Preview',
        received_at: 1700000000000,
        read_at: null
    }
];

function createEnv() {
    return {
        EMAIL_DOMAIN: 'akunlama.com',
        ADMIN_ACCESS_KEY: 'secret-key',
        DB: {
            prepare() {
                return {
                    async all() {
                        return { results: emailRows };
                    },
                    bind() {
                        return {
                            async all() {
                                return { results: emailRows };
                            }
                        };
                    }
                };
            }
        }
    };
}

describe('Admin route behavior', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('does not publicly cache authorized /api/events wildcard responses', async () => {
        const request = new Request('https://example.com/api/events?recipient=*', {
            headers: { Authorization: 'Bearer secret-key' }
        });
        const response = await handleEvents(request, new URL(request.url), createEnv());

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');

        const body = await response.json();
        expect(body.items).toHaveLength(1);
    });

    test('does not publicly cache authorized legacy wildcard responses', async () => {
        const request = new Request('https://example.com/api/list?recipient=*', {
            headers: { Authorization: 'Bearer secret-key' }
        });
        const response = await handleList(request, new URL(request.url), createEnv());

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');

        const body = await response.json();
        expect(body).toHaveLength(1);
    });

    test('rejects legacy wildcard requests without admin authorization', async () => {
        const request = new Request('https://example.com/api/list?recipient=*');
        const response = await handleList(request, new URL(request.url), createEnv());

        expect(response.status).toBe(403);
        await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
    });

    test('does not cache authorized debug responses', async () => {
        const request = new Request('https://example.com/api/debug', {
            headers: { Authorization: 'Bearer secret-key' }
        });
        const response = await handleDebug(request, new URL(request.url), createEnv(), { waitUntil() {} });

        expect(response.status).toBe(200);
        expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
});
