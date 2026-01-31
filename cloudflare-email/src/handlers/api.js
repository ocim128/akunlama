// api.js - HTTP API router

import { createHeaders, jsonResponse } from '../utils/http.js';
import { handleEvents } from '../routes/events.js';
import { handleStream } from '../routes/stream.js';
import { handleGetEmail, handleMarkRead } from '../routes/email-content.js';
import { handleList, handleGetKey, handleGetHtml } from '../routes/legacy.js';
import { handleHealth, handleDebug, handleCleanup } from '../routes/admin.js';

/**
 * HTTP fetch handler - API router
 */
export async function handleFetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: createHeaders() });
    }

    try {
        // ============================================
        // LEGACY REDIRECTS (301 permanent)
        // ============================================

        // Redirect old /api/v1/mail/list to /api/list
        if (path === '/api/v1/mail/list') {
            const newUrl = new URL(url);
            newUrl.pathname = '/api/list';
            return Response.redirect(newUrl.toString(), 301);
        }

        // Redirect old /api/v1/mail/getHtml to /api/getHtml
        if (path === '/api/v1/mail/getHtml') {
            const newUrl = new URL(url);
            newUrl.pathname = '/api/getHtml';
            return Response.redirect(newUrl.toString(), 301);
        }

        // Redirect old /api/v1/mail/getKey to /api/getKey
        if (path === '/api/v1/mail/getKey') {
            const newUrl = new URL(url);
            newUrl.pathname = '/api/getKey';
            return Response.redirect(newUrl.toString(), 301);
        }

        // ============================================
        // MAIN API ROUTES
        // ============================================

        // GET /api/events - List emails (Mailgun-compatible)
        if (path === '/api/events') {
            return handleEvents(request, url, env);
        }

        // GET /api/stream - SSE for real-time updates
        if (path === '/api/stream') {
            return handleStream(request, url, env, ctx);
        }

        // GET /api/email/:id - Get email content
        if (path.startsWith('/api/email/') && !path.includes('/read')) {
            const emailId = path.replace('/api/email/', '');
            return handleGetEmail(request, url, emailId, env);
        }

        // PATCH /api/email/:id/read - Mark email as read
        if (path.match(/^\/api\/email\/[^/]+\/read$/) && request.method === 'PATCH') {
            const pathParts = path.split('/');
            const emailId = pathParts[3];
            return handleMarkRead(request, url, emailId, env);
        }

        // ============================================
        // LEGACY API ROUTES (backward compatibility)
        // ============================================

        // Redirect old /api/v1/mail/list to /api/list
        if (path === '/api/v1/mail/list') {
            const newUrl = new URL(request.url);
            newUrl.pathname = '/api/list';
            return Response.redirect(newUrl.toString(), 301);
        }

        // GET /api/list - Legacy email list
        if (path === '/api/list') {
            return handleList(request, url, env);
        }

        // GET /api/getKey - Legacy email metadata
        if (path === '/api/getKey') {
            return handleGetKey(request, url, env);
        }

        // GET /api/getHtml - Legacy HTML content
        if (path === '/api/getHtml') {
            return handleGetHtml(request, url, env);
        }

        // ============================================
        // ADMIN ROUTES
        // ============================================

        // GET /api/health - Health check
        if (path === '/api/health') {
            return handleHealth(request, env);
        }

        // GET /api/debug - Debug info
        if (path === '/api/debug') {
            return handleDebug(request, env);
        }

        // POST /api/cleanup - Manual cleanup trigger
        if (path === '/api/cleanup' && request.method === 'POST') {
            return handleCleanup(request, url, env, ctx);
        }

        // 404 for unknown routes
        return jsonResponse({ error: 'Not found' }, 404);

    } catch (error) {
        console.error('API Error:', error);
        return jsonResponse({ error: 'Internal server error' }, 500);
    }
}
