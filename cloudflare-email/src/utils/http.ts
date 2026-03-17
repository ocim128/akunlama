// http.ts - HTTP response helpers

/**
 * Get client IP from request headers
 */
export const getClientIP = (request: Request): string => {
    return request.headers.get('CF-Connecting-IP') ||
        request.headers.get('X-Real-IP') ||
        request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
        'unknown';
};

/**
 * Create standardized CORS + security headers
 */
export const createHeaders = (additionalHeaders: Record<string, string> = {}): Record<string, string> => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    ...additionalHeaders
});

/**
 * Generate a simple ETag from data (FNV-1a hash)
 */
export const generateETag = (data: unknown): string => {
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
export const jsonResponse = (
    data: unknown,
    status: number = 200,
    additionalHeaders: Record<string, string> = {}
): Response => {
    return new Response(JSON.stringify(data), {
        status,
        headers: createHeaders(additionalHeaders)
    });
};

/**
 * Create cached JSON response with ETag support for 304
 */
export const cachedJsonResponse = (
    request: Request,
    data: unknown,
    status: number = 200,
    maxAge: number = 10
): Response => {
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
