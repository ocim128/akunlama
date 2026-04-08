// http.test.js - Tests for HTTP response utilities
import {
    getClientIP,
    createHeaders,
    generateETag,
    jsonResponse,
    cachedJsonResponse
} from '../../src/utils/http.ts';
import { expect, test, describe, vi } from 'vitest';

describe('HTTP Utils', () => {
    describe('getClientIP', () => {
        test('extracts IP from CF-Connecting-IP header', () => {
            const request = {
                headers: new Map([
                    ['CF-Connecting-IP', '1.2.3.4'],
                    ['X-Real-IP', '5.6.7.8']
                ])
            };
            request.headers.get = (key) => request.headers.has(key) ? request.headers.get(key) : null;

            // Recreate with proper get method
            const mockRequest = {
                headers: {
                    get: (key) => {
                        const headers = {
                            'CF-Connecting-IP': '1.2.3.4',
                            'X-Real-IP': '5.6.7.8'
                        };
                        return headers[key] || null;
                    }
                }
            };

            expect(getClientIP(mockRequest)).toBe('1.2.3.4');
        });

        test('falls back to X-Real-IP when CF header missing', () => {
            const mockRequest = {
                headers: {
                    get: (key) => {
                        const headers = {
                            'X-Real-IP': '5.6.7.8'
                        };
                        return headers[key] || null;
                    }
                }
            };

            expect(getClientIP(mockRequest)).toBe('5.6.7.8');
        });

        test('falls back to X-Forwarded-For when others missing', () => {
            const mockRequest = {
                headers: {
                    get: (key) => {
                        const headers = {
                            'X-Forwarded-For': '9.10.11.12, 1.2.3.4'
                        };
                        return headers[key] || null;
                    }
                }
            };

            expect(getClientIP(mockRequest)).toBe('9.10.11.12');
        });

        test('returns "unknown" when no IP headers present', () => {
            const mockRequest = {
                headers: {
                    get: () => null
                }
            };

            expect(getClientIP(mockRequest)).toBe('unknown');
        });

        test('handles X-Forwarded-For with single IP', () => {
            const mockRequest = {
                headers: {
                    get: (key) => {
                        const headers = {
                            'X-Forwarded-For': '192.168.1.1'
                        };
                        return headers[key] || null;
                    }
                }
            };

            expect(getClientIP(mockRequest)).toBe('192.168.1.1');
        });
    });

    describe('createHeaders', () => {
        test('includes required security headers', () => {
            const headers = createHeaders();

            expect(headers['Content-Type']).toBe('application/json');
            expect(headers['Access-Control-Allow-Origin']).toBe('*');
            expect(headers['X-Content-Type-Options']).toBe('nosniff');
            expect(headers['X-Frame-Options']).toBe('SAMEORIGIN');
            expect(headers['X-XSS-Protection']).toBe('1; mode=block');
            expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
        });

        test('includes CORS headers', () => {
            const headers = createHeaders();

            expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PATCH, OPTIONS');
            expect(headers['Access-Control-Allow-Headers']).toBe('Authorization, Content-Type, If-None-Match');
        });

        test('merges additional headers', () => {
            const headers = createHeaders({
                'X-Custom-Header': 'custom-value',
                'Cache-Control': 'no-cache'
            });

            expect(headers['X-Custom-Header']).toBe('custom-value');
            expect(headers['Cache-Control']).toBe('no-cache');
        });

        test('additional headers override defaults', () => {
            const headers = createHeaders({
                'Content-Type': 'text/html'
            });

            expect(headers['Content-Type']).toBe('text/html');
        });
    });

    describe('generateETag', () => {
        test('generates consistent ETag for same data', () => {
            const data = { foo: 'bar', num: 123 };
            const etag1 = generateETag(data);
            const etag2 = generateETag(data);

            expect(etag1).toBe(etag2);
        });

        test('generates different ETags for different data', () => {
            const etag1 = generateETag({ foo: 'bar' });
            const etag2 = generateETag({ foo: 'baz' });

            expect(etag1).not.toBe(etag2);
        });

        test('returns quoted string format', () => {
            const etag = generateETag({ test: 'data' });

            expect(etag).toMatch(/^"[a-f0-9]+"$/);
        });

        test('handles empty object', () => {
            const etag = generateETag({});
            expect(etag).toMatch(/^"[a-f0-9]+"$/);
        });

        test('handles null values in data', () => {
            const etag = generateETag({ foo: null, bar: undefined });
            expect(etag).toMatch(/^"[a-f0-9]+"$/);
        });

        test('handles arrays', () => {
            const etag = generateETag([1, 2, 3]);
            expect(etag).toMatch(/^"[a-f0-9]+"$/);
        });

        test('handles nested objects', () => {
            const etag = generateETag({ nested: { deeply: { value: 'test' } } });
            expect(etag).toMatch(/^"[a-f0-9]+"$/);
        });
    });

    describe('jsonResponse', () => {
        test('creates Response with JSON body', async () => {
            const data = { message: 'Hello' };
            const response = jsonResponse(data);

            expect(response).toBeInstanceOf(Response);

            const body = await response.json();
            expect(body).toEqual(data);
        });

        test('uses default status 200', () => {
            const response = jsonResponse({ message: 'OK' });
            expect(response.status).toBe(200);
        });

        test('accepts custom status code', () => {
            const response = jsonResponse({ error: 'Not found' }, 404);
            expect(response.status).toBe(404);
        });

        test('includes standard headers', () => {
            const response = jsonResponse({ test: true });

            expect(response.headers.get('Content-Type')).toBe('application/json');
            expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
        });

        test('includes additional headers', () => {
            const response = jsonResponse({ test: true }, 200, { 'X-Custom': 'value' });
            expect(response.headers.get('X-Custom')).toBe('value');
        });
    });

    describe('cachedJsonResponse', () => {
        test('returns 304 when ETag matches If-None-Match', async () => {
            const data = { items: [1, 2, 3] };
            const etag = generateETag(data);

            const mockRequest = {
                headers: {
                    get: (key) => key === 'If-None-Match' ? etag : null
                }
            };

            const response = cachedJsonResponse(mockRequest, data);

            expect(response.status).toBe(304);
        });

        test('returns 200 with data when ETag does not match', async () => {
            const data = { items: [1, 2, 3] };

            const mockRequest = {
                headers: {
                    get: (key) => key === 'If-None-Match' ? '"old-etag"' : null
                }
            };

            const response = cachedJsonResponse(mockRequest, data);

            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual(data);
        });

        test('returns 200 when no If-None-Match header', async () => {
            const data = { items: [1, 2, 3] };

            const mockRequest = {
                headers: {
                    get: () => null
                }
            };

            const response = cachedJsonResponse(mockRequest, data);

            expect(response.status).toBe(200);
        });

        test('includes ETag header in 200 response', () => {
            const data = { foo: 'bar' };
            const mockRequest = {
                headers: { get: () => null }
            };

            const response = cachedJsonResponse(mockRequest, data);

            expect(response.headers.get('ETag')).toBeTruthy();
        });

        test('includes ETag header in 304 response', () => {
            const data = { foo: 'bar' };
            const etag = generateETag(data);
            const mockRequest = {
                headers: {
                    get: (key) => key === 'If-None-Match' ? etag : null
                }
            };

            const response = cachedJsonResponse(mockRequest, data);

            expect(response.headers.get('ETag')).toBe(etag);
        });

        test('includes Cache-Control header with default maxAge', () => {
            const mockRequest = {
                headers: { get: () => null }
            };

            const response = cachedJsonResponse(mockRequest, { test: 1 });

            expect(response.headers.get('Cache-Control')).toContain('max-age=10');
        });

        test('includes Cache-Control header with custom maxAge', () => {
            const mockRequest = {
                headers: { get: () => null }
            };

            const response = cachedJsonResponse(mockRequest, { test: 1 }, 200, 60);

            expect(response.headers.get('Cache-Control')).toContain('max-age=60');
        });

        test('includes stale-while-revalidate directive', () => {
            const mockRequest = {
                headers: { get: () => null }
            };

            const response = cachedJsonResponse(mockRequest, { test: 1 });

            expect(response.headers.get('Cache-Control')).toContain('stale-while-revalidate=60');
        });

        test('includes Vary header', () => {
            const mockRequest = {
                headers: { get: () => null }
            };

            const response = cachedJsonResponse(mockRequest, { test: 1 });

            expect(response.headers.get('Vary')).toBe('Accept, If-None-Match');
        });
    });
});
