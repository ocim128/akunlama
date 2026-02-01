// admin.ts - Admin route handlers (/api/cleanup, /api/debug, /api/health)

import { jsonResponse } from '../utils/http.ts';
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
 * Debug endpoint - check env vars
 */
export async function handleDebug(
    request: Request,
    url: URL,
    env: AdminEnv,
    ctx: ExecutionContext
): Promise<Response> {
    return jsonResponse({
        EMAIL_DOMAIN: env.EMAIL_DOMAIN,
        computedFullEmail: ('test' + '@' + (env.EMAIL_DOMAIN || 'akunlama.com')).toLowerCase()
    });
}

/**
 * POST /api/cleanup?key=...
 * Manual cleanup trigger (admin only)
 */
export async function handleCleanup(
    request: Request,
    url: URL,
    env: AdminEnv,
    ctx: ExecutionContext
): Promise<Response> {
    const key = url.searchParams.get('key');

    if (key !== env.ADMIN_ACCESS_KEY) {
        return jsonResponse({ error: 'Unauthorized' }, 403);
    }

    if (ctx.waitUntil) {
        ctx.waitUntil(runCleanup(env));
        return jsonResponse({ status: 'Cleanup started in background' });
    } else {
        const result = await runCleanup(env);
        return jsonResponse(result);
    }
}
