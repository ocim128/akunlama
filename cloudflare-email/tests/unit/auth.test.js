import { isAuthorizedAdmin } from '../../src/utils/auth.ts';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Auth Utils', () => {
    const env = { ADMIN_ACCESS_KEY: 'secret-key' };

    beforeEach(() => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    test('authorizes bearer token', () => {
        const request = new Request('https://example.com/api/debug', {
            headers: { Authorization: 'Bearer secret-key' }
        });
        const url = new URL(request.url);

        expect(isAuthorizedAdmin(request, url, env)).toBe(true);
        expect(console.warn).not.toHaveBeenCalled();
    });

    test('rejects missing token', () => {
        const request = new Request('https://example.com/api/debug');
        const url = new URL(request.url);

        expect(isAuthorizedAdmin(request, url, env)).toBe(false);
    });

    test('keeps legacy admin_key query fallback with warning', () => {
        const request = new Request('https://example.com/api/events?recipient=*&admin_key=secret-key');
        const url = new URL(request.url);

        expect(isAuthorizedAdmin(request, url, env)).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });

    test('keeps legacy key query fallback with warning', () => {
        const request = new Request('https://example.com/api/cleanup?key=secret-key');
        const url = new URL(request.url);

        expect(isAuthorizedAdmin(request, url, env)).toBe(true);
        expect(console.warn).toHaveBeenCalled();
    });
});
