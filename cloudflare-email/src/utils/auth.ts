// auth.ts - Admin authorization helpers

import type { Env } from '../types/index.d.ts';

interface AdminEnv extends Env {
    ADMIN_ACCESS_KEY?: string;
}

const getBearerToken = (request: Request): string | null => {
    const header = request.headers.get('Authorization');
    if (!header) {
        return null;
    }

    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
};

const getLegacyQueryToken = (url: URL): string | null => {
    const token = url.searchParams.get('admin_key') || url.searchParams.get('key');
    if (token) {
        console.warn('[SECURITY] Legacy admin query token used; prefer Authorization: Bearer.');
    }
    return token;
};

export const isAuthorizedAdmin = (
    request: Request,
    url: URL,
    env: AdminEnv
): boolean => {
    const validAdminKey = env.ADMIN_ACCESS_KEY;
    if (!validAdminKey) {
        return false;
    }

    const providedToken = getBearerToken(request) || getLegacyQueryToken(url);
    return providedToken === validAdminKey;
};
