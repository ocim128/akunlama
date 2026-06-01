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
});
