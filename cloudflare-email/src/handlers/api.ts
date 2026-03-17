// api.ts - HTTP API router

import { createHeaders, jsonResponse } from '../utils/http.ts';
import { handleEvents } from '../routes/events.ts';
import { handleStream } from '../routes/stream.ts';
import { handleGetEmail, handleMarkRead } from '../routes/email-content.ts';
import { handleList, handleGetKey, handleGetHtml } from '../routes/legacy.ts';
import { handleHealth, handleDebug, handleCleanup } from '../routes/admin.ts';
import { handleOutboundPurchaseEmail } from '../routes/outbound.ts';
import type { Env } from '../types/index.d.ts';

/** Extended environment for API handlers */
interface ApiEnv extends Env {
    EMAIL_DOMAIN?: string;
    ADMIN_ACCESS_KEY?: string;
}

/** Execution context with waitUntil */
interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
}

/** Route handler function type */
type RouteHandler = (
    request: Request,
    url: URL,
    env: ApiEnv,
    ctx: ExecutionContext
) => Promise<Response> | Response;

/** Route definition */
interface RouteDefinition {
    redirect?: string;
    status?: number;
    handler?: RouteHandler;
    methods?: string[];
}

/** Route registry type */
type RouteRegistry = Record<string, RouteDefinition>;

// Route Registry
const ROUTES: RouteRegistry = {
    // ============================================
    // LEGACY REDIRECTS (301)
    // ============================================
    '/api/v1/mail/list': { redirect: '/api/list', status: 301 },
    '/api/v1/mail/getHtml': { redirect: '/api/getHtml', status: 301 },
    '/api/v1/mail/getKey': { redirect: '/api/getKey', status: 301 },

    // ============================================
    // MAIN API ROUTES
    // ============================================
    '/api/events': { handler: handleEvents, methods: ['GET'] },
    '/api/stream': { handler: handleStream, methods: ['GET'] },

    // ============================================
    // LEGACY API ROUTES
    // ============================================
    '/api/list': { handler: handleList, methods: ['GET'] },
    '/api/getKey': { handler: handleGetKey, methods: ['GET'] },
    '/api/getHtml': { handler: handleGetHtml, methods: ['GET'] },

    // ============================================
    // ADMIN ROUTES
    // ============================================
    '/api/health': { handler: handleHealth, methods: ['GET'] },
    '/api/debug': { handler: handleDebug, methods: ['GET'] },
    '/api/cleanup': { handler: handleCleanup, methods: ['POST'] },
    '/api/outbound/purchase': { handler: handleOutboundPurchaseEmail, methods: ['POST'] }
};

/**
 * HTTP fetch handler - API router
 */
export async function handleFetch(
    request: Request,
    env: ApiEnv,
    ctx: ExecutionContext
): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: createHeaders() });
    }

    try {
        // 1. Check Route Registry
        const route = ROUTES[path];

        if (route) {
            // Handle Redirects
            if (route.redirect) {
                const newUrl = new URL(url);
                newUrl.pathname = route.redirect;
                return Response.redirect(newUrl.toString(), route.status || 301);
            }

            // Handle Methods
            if (route.handler) {
                if (route.methods && !route.methods.includes(request.method)) {
                    return jsonResponse({ error: 'Method not allowed' }, 405);
                }
                return route.handler(request, url, env, ctx);
            }
        }

        // 2. Handle Dynamic Routes

        // GET /api/email/:id
        if (path.startsWith('/api/email/') && !path.includes('/read')) {
            const emailId = path.replace('/api/email/', '');
            return handleGetEmail(request, url, emailId, env);
        }

        // PATCH /api/email/:id/read
        if (path.match(/^\/api\/email\/[^/]+\/read$/)) {
            if (request.method !== 'PATCH') {
                return jsonResponse({ error: 'Method not allowed' }, 405);
            }
            const pathParts = path.split('/');
            const emailId = pathParts[3];
            return handleMarkRead(request, url, emailId, env);
        }

        // 3. Fallback
        return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500);
    }
}
