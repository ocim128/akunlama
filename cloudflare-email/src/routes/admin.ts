// admin.ts - Admin route handlers (/api/cleanup, /api/debug, /api/health)

import { jsonResponse } from '../utils/http.ts';
import { isAuthorizedAdmin } from '../utils/auth.ts';
import { runCleanup } from '../services/cleanup.ts';
import type { Env } from '../types/index.d.ts';

/** Extended environment for admin handlers */
interface AdminEnv extends Env {
    EMAIL_DOMAIN?: string;
    ADMIN_ACCESS_KEY?: string;
}

/** Execution context with waitUntil */
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

/**
 * GET /api/health
 * Health check endpoint
 */
export async function handleHealth(
    request: Request,
    url: URL,
    env: AdminEnv,
    ctx: ExecutionContext
): Promise<Response> {
    return jsonResponse({ status: 'ok', timestamp: Date.now() });
}

/**
 * GET /api/debug
 * Admin-only debug endpoint - check env vars
 */
export async function handleDebug(
    request: Request,
    url: URL,
    env: AdminEnv,
    ctx: ExecutionContext
): Promise<Response> {
    if (!isAuthorizedAdmin(request, url, env)) {
        return jsonResponse({ error: 'Unauthorized' }, 403, { 'Cache-Control': 'no-store' });
    }

    return jsonResponse({
        EMAIL_DOMAIN: env.EMAIL_DOMAIN,
        computedFullEmail: ('test' + '@' + (env.EMAIL_DOMAIN || 'akunlama.com')).toLowerCase()
    }, 200, { 'Cache-Control': 'no-store' });
}

/**
 * POST /api/cleanup
 * Manual cleanup trigger (admin only)
 * Prefer Authorization: Bearer <ADMIN_ACCESS_KEY>; legacy key query is still accepted.
 */
export async function handleCleanup(
    request: Request,
    url: URL,
    env: AdminEnv,
    ctx: ExecutionContext
): Promise<Response> {
    if (!isAuthorizedAdmin(request, url, env)) {
        return jsonResponse({ error: 'Unauthorized' }, 403, { 'Cache-Control': 'no-store' });
    }

    if (ctx.waitUntil) {
        ctx.waitUntil(runCleanup(env));
        return jsonResponse({ status: 'Cleanup started in background' }, 200, { 'Cache-Control': 'no-store' });
    } else {
        const result = await runCleanup(env);
        return jsonResponse(result, 200, { 'Cache-Control': 'no-store' });
    }
}
