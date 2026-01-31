// admin.js - Admin route handlers (/api/cleanup, /api/debug, /api/health)

import { jsonResponse } from '../utils/http.js';
import { runCleanup } from '../services/cleanup.js';

/**
 * GET /api/health
 * Health check endpoint
 */
export async function handleHealth(request, env) {
    return jsonResponse({ status: 'ok', timestamp: Date.now() });
}

/**
 * GET /api/debug
 * Debug endpoint - check env vars
 */
export async function handleDebug(request, env) {
    return jsonResponse({
        EMAIL_DOMAIN: env.EMAIL_DOMAIN,
        computedFullEmail: ('test' + '@' + (env.EMAIL_DOMAIN || 'akunlama.com')).toLowerCase()
    });
}

/**
 * POST /api/cleanup?key=...
 * Manual cleanup trigger (admin only)
 */
export async function handleCleanup(request, url, env, ctx) {
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
