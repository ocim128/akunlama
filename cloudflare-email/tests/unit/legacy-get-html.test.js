import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { handleGetHtml } from '../../src/routes/legacy.ts';

const originalHTMLRewriter = globalThis.HTMLRewriter;

class TestElement {
    constructor(attributes) {
        this.attributes = attributes;
    }

    getAttribute(name) {
        return this.attributes.get(name) || null;
    }

    setAttribute(name, value) {
        this.attributes.set(name, value);
        return this;
    }
}

class TestHTMLRewriter {
    constructor() {
        this.handlers = [];
    }

    on(selector, handlers) {
        this.handlers.push({ selector, handlers });
        return this;
    }

    transform(response) {
        const stream = new ReadableStream({
            start: async controller => {
                const html = await response.text();
                const rewritten = html.replace(/<(a|area)\b([^>]*)>/gi, (match, tagName, rawAttributes) => {
                    const attributes = new Map();
                    rawAttributes.replace(/([:\w-]+)="([^"]*)"/g, (_attribute, name, value) => {
                        attributes.set(name, value);
                        return '';
                    });

                    for (const { selector, handlers } of this.handlers) {
                        if (selector !== `${tagName.toLowerCase()}[href]` || !attributes.has('href')) {
                            continue;
                        }
                        handlers.element(new TestElement(attributes));
                    }

                    const attrText = Array.from(attributes)
                        .map(([name, value]) => `${name}="${value}"`)
                        .join(' ');

                    return `<${tagName}${attrText ? ` ${attrText}` : ''}>`;
                });

                controller.enqueue(new TextEncoder().encode(rewritten));
                controller.close();
            }
        });

        return new Response(stream, {
            status: response.status,
            headers: response.headers
        });
    }
}

function createEnv(row) {
    return {
        DB: {
            prepare() {
                return {
                    bind() {
                        return {
                            async first() {
                                return row;
                            }
                        };
                    }
                };
            }
        }
    };
}

describe('legacy getHtml route', () => {
    beforeEach(() => {
        globalThis.HTMLRewriter = TestHTMLRewriter;
    });

    afterEach(() => {
        globalThis.HTMLRewriter = originalHTMLRewriter;
    });

    test.each([
        [
            'inline tracking image markup',
            'Example: <img src="https://example.net/track">',
            'Example: &lt;img src="https://example.net/track"&gt;'
        ],
        [
            'a body that starts with HTML-like markup',
            '<style>body { display: none }</style><a href="https://example.net">Example</a>',
            '&lt;style&gt;body { display: none }&lt;/style&gt;&lt;a href="https://example.net"&gt;Example&lt;/a&gt;'
        ],
        [
            'angle brackets and literal HTML entities',
            'Contact <person@example.net> & use &lt;value&gt; when 1 < 2 > 0.',
            'Contact &lt;person@example.net&gt; &amp; use &amp;lt;value&amp;gt; when 1 &lt; 2 &gt; 0.'
        ],
        [
            'already-decoded Unicode and literal quoted-printable syntax',
            'Literal =3D, café, and 😀',
            'Literal =3D, café, and 😀'
        ],
        ['LF line breaks', 'First\nSecond', 'First<br>Second'],
        ['CRLF line breaks', 'First\r\nSecond', 'First\r<br>Second']
    ])('displays %s as plain text without interpreting message content', async (_scenario, text, escaped) => {
        const request = new Request('https://example.com/api/getHtml?key=plain-email');
        const response = await handleGetHtml(request, new URL(request.url), createEnv({
            body_html: null,
            body_text: text
        }));

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
        expect(await response.text()).toContain(`>${escaped}</div>`);
    });

    test('renders the HTML MIME alternative when both HTML and plain text are stored', async () => {
        const request = new Request('https://example.com/api/getHtml?key=html-email');
        const response = await handleGetHtml(request, new URL(request.url), createEnv({
            body_html: '<p>Formatted <strong>content</strong></p>',
            body_text: 'Plain alternative'
        }));

        const body = await response.text();
        expect(body).toBe('<p>Formatted <strong>content</strong></p>');
        expect(body).not.toContain('Plain alternative');
    });

    test('revalidates escaped plain text without serving a stale response for changed content', async () => {
        const request = new Request('https://example.com/api/getHtml?key=plain-email');
        const row = { body_html: null, body_text: 'Example <img src="https://example.net/track">' };
        const response = await handleGetHtml(request, new URL(request.url), createEnv(row));
        const etag = response.headers.get('ETag');
        expect(etag).toBeTruthy();
        expect(await response.text()).toContain('Example &lt;img src="https://example.net/track"&gt;');

        const conditional = new Request(request.url, { headers: { 'If-None-Match': etag } });
        const cached = await handleGetHtml(conditional, new URL(conditional.url), createEnv(row));
        expect(cached.status).toBe(304);
        expect(await cached.text()).toBe('');
        expect(cached.headers.get('Content-Security-Policy')).toBe(response.headers.get('Content-Security-Policy'));

        const changed = await handleGetHtml(conditional, new URL(conditional.url), createEnv({
            ...row, body_text: 'Updated <example>'
        }));
        expect(changed.status).toBe(200);
        expect(changed.headers.get('ETag')).not.toBe(etag);
        expect(await changed.text()).toContain('Updated &lt;example&gt;');
    });

    test('forces stored email links to open outside the iframe', async () => {
        const request = new Request('https://example.com/api/getHtml?key=email-1');
        const response = await handleGetHtml(request, new URL(request.url), createEnv({
            body_html: '<p>Confirm at <a href="https://www.facebook.com/help/check-email">www.facebook.com/help/check-email</a></p>',
            body_text: null
        }));

        const body = await response.text();

        expect(body).toContain('href="https://www.facebook.com/help/check-email"');
        expect(body).toContain('target="_blank"');
        expect(body).toContain('rel="noopener noreferrer"');
    });

    test('preserves existing rel values while adding iframe escape protection', async () => {
        const request = new Request('https://example.com/api/getHtml?key=email-1');
        const response = await handleGetHtml(request, new URL(request.url), createEnv({
            body_html: '<a href="https://example.com" target="_self" rel="nofollow">Link</a>',
            body_text: null
        }));

        const body = await response.text();

        expect(body).toContain('target="_blank"');
        expect(body).toContain('rel="nofollow noopener noreferrer"');
    });

    test('protects directly opened email HTML while preserving its layout', async () => {
        const request = new Request('https://example.com/api/getHtml?key=email-1');
        const response = await handleGetHtml(request, new URL(request.url), createEnv({
            body_html: '<style>p { color: red }</style><p>Hello</p><script>alert(1)</script>',
            body_text: null
        }));
        const policy = response.headers.get('Content-Security-Policy');

        expect(policy).toContain("script-src 'none'");
        expect(policy).toContain('sandbox allow-same-origin allow-popups allow-popups-to-escape-sandbox');
        expect(policy).toContain("form-action 'none'");
        expect(policy).toContain('allow-modals');
        expect(policy).not.toContain('allow-scripts');
        expect(await response.text()).toContain('<style>p { color: red }</style><p>Hello</p>');

        const conditionalRequest = new Request(request.url, {
            headers: { 'If-None-Match': response.headers.get('ETag') }
        });
        const cached = await handleGetHtml(conditionalRequest, new URL(request.url), createEnv({
            body_html: '<style>p { color: red }</style><p>Hello</p><script>alert(1)</script>',
            body_text: null
        }));
        expect(cached.status).toBe(304);
        expect(cached.headers.get('Content-Security-Policy')).toBe(policy);
    });
});
