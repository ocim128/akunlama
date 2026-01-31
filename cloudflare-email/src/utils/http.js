// http.js - HTTP response helpers

/**
 * Get client IP from request headers
 */
export const getClientIP = (request) => {
    return request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Real-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';
};

/**
 * Create standardized CORS + security headers
 */
export const createHeaders = (additionalHeaders = {}) => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, If-None-Match',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...additionalHeaders
});

/**
 * Generate a simple ETag from data (FNV-1a hash)
 */
export const generateETag = (data) => {
    const str = JSON.stringify(data);
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = (hash * 16777619) >>> 0;
    }
    return `"${hash.toString(16)}"`;
};

/**
 * Create JSON response
 */
export const jsonResponse = (data, status = 200, additionalHeaders = {}) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: createHeaders(additionalHeaders)
    });
};

/**
 * Create cached JSON response with ETag support for 304
 */
export const cachedJsonResponse = (request, data, status = 200, maxAge = 10) => {
    const etag = generateETag(data);
    const ifNoneMatch = request.headers.get('If-None-Match');

    if (ifNoneMatch && ifNoneMatch === etag) {
        return new Response(null, {
            status: 304,
            headers: createHeaders({
                'ETag': etag,
                'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=60`
            })
        });
    }

    return new Response(JSON.stringify(data), {
        status,
        headers: createHeaders({
            'ETag': etag,
            'Cache-Control': `public, max-age=${maxAge}, stale-while-revalidate=60`,
            'Vary': 'Accept, If-None-Match'
        })
    });
};
