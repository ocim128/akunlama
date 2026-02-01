/**
 * Unit Tests for the Sanitizer Utility
 * 
 * Tests the DOMPurify-based HTML sanitization functionality.
 */
import { describe, it, expect } from 'vitest';
import {
    sanitizeEmailHTML,
    sanitizeText,
    stripHTML,
    detectDangerousPatterns,
    sanitizeURL
} from '@/utils/sanitizer';

describe('Sanitizer Utility', () => {
    describe('sanitizeEmailHTML', () => {
        it('should keep safe HTML tags', () => {
            const html = '<p>Hello <strong>World</strong>!</p>';
            const result = sanitizeEmailHTML(html);
            expect(result).toContain('<p>');
            expect(result).toContain('<strong>');
            expect(result).toContain('Hello');
        });

        it('should remove script tags', () => {
            const html = '<p>Hello</p><script>alert("XSS")</script>';
            const result = sanitizeEmailHTML(html);
            expect(result).not.toContain('<script');
            expect(result).not.toContain('alert');
            expect(result).toContain('<p>Hello</p>');
        });

        it('should remove iframe tags', () => {
            const html = '<p>Text</p><iframe src="evil.com"></iframe>';
            const result = sanitizeEmailHTML(html);
            expect(result).not.toContain('<iframe');
            expect(result).not.toContain('evil.com');
        });

        it('should remove event handlers', () => {
            const html = '<img src="img.png" onerror="alert(1)">';
            const result = sanitizeEmailHTML(html);
            expect(result).not.toContain('onerror');
            expect(result).not.toContain('alert');
        });

        it('should allow safe attributes', () => {
            const html = '<a href="https://example.com" class="link">Click</a>';
            const result = sanitizeEmailHTML(html);
            expect(result).toContain('href');
            expect(result).toContain('class');
        });

        it('should force links to open in new tab', () => {
            const html = '<a href="https://example.com">Link</a>';
            const result = sanitizeEmailHTML(html);
            expect(result).toContain('target="_blank"');
            expect(result).toContain('rel="noopener noreferrer"');
        });

        it('should return empty string for null/undefined input', () => {
            // @ts-ignore
            expect(sanitizeEmailHTML(null)).toBe('');
            // @ts-ignore
            expect(sanitizeEmailHTML(undefined)).toBe('');
            expect(sanitizeEmailHTML('')).toBe('');
        });

        it('should remove form elements', () => {
            const html = '<form action="/steal"><input type="text" name="password"></form>';
            const result = sanitizeEmailHTML(html);
            expect(result).not.toContain('<form');
            expect(result).not.toContain('<input');
        });

        it('should preserve tables used in emails', () => {
            const html = '<table><tr><td>Cell 1</td><td>Cell 2</td></tr></table>';
            const result = sanitizeEmailHTML(html);
            expect(result).toContain('<table');
            expect(result).toContain('<tr');
            expect(result).toContain('<td');
        });
    });

    describe('sanitizeText', () => {
        it('should escape HTML entities', () => {
            const text = '<script>alert("XSS")</script>';
            const result = sanitizeText(text);
            expect(result).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
        });

        it('should escape ampersands', () => {
            const text = 'Hello & World';
            const result = sanitizeText(text);
            expect(result).toBe('Hello &amp; World');
        });

        it('should handle empty input', () => {
            expect(sanitizeText('')).toBe('');
            // @ts-ignore
            expect(sanitizeText(null)).toBe('');
        });
    });

    describe('stripHTML', () => {
        it('should remove all HTML and return plain text', () => {
            const html = '<p>Hello <strong>World</strong>!</p>';
            const result = stripHTML(html);
            expect(result).toBe('Hello World!');
        });

        it('should handle nested HTML', () => {
            const html = '<div><p><span>Nested</span> text</p></div>';
            const result = stripHTML(html);
            expect(result).toBe('Nested text');
        });
    });

    describe('detectDangerousPatterns', () => {
        it('should detect script tags', () => {
            const content = '<script>malicious()</script>';
            const result = detectDangerousPatterns(content);
            expect(result.isDangerous).toBe(true);
            expect(result.patterns).toContain('script');
        });

        it('should detect javascript: URLs', () => {
            const content = '<a href="javascript:alert(1)">Click</a>';
            const result = detectDangerousPatterns(content);
            expect(result.isDangerous).toBe(true);
            expect(result.patterns).toContain('javascript');
        });

        it('should detect event handlers', () => {
            const content = '<img src="x" onerror="alert(1)">';
            const result = detectDangerousPatterns(content);
            expect(result.isDangerous).toBe(true);
            expect(result.patterns).toContain('onEvent');
        });

        it('should detect iframes', () => {
            const content = '<iframe src="evil.com"></iframe>';
            const result = detectDangerousPatterns(content);
            expect(result.isDangerous).toBe(true);
            expect(result.patterns).toContain('iframe');
        });

        it('should return safe for normal content', () => {
            const content = '<p>This is safe content with a <a href="https://example.com">link</a></p>';
            const result = detectDangerousPatterns(content);
            expect(result.isDangerous).toBe(false);
            expect(result.patterns).toHaveLength(0);
        });

        it('should handle empty/null input', () => {
            expect(detectDangerousPatterns('').isDangerous).toBe(false);
            // @ts-ignore
            expect(detectDangerousPatterns(null).isDangerous).toBe(false);
        });
    });

    describe('sanitizeURL', () => {
        it('should allow safe http URLs', () => {
            const url = 'https://example.com/page';
            expect(sanitizeURL(url)).toBe(url);
        });

        it('should block javascript: URLs', () => {
            expect(sanitizeURL('javascript:alert(1)')).toBe('');
        });

        it('should block vbscript: URLs', () => {
            expect(sanitizeURL('vbscript:msgbox(1)')).toBe('');
        });

        it('should block data:text/html URLs', () => {
            expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
        });

        it('should handle empty input', () => {
            expect(sanitizeURL('')).toBe('');
            // @ts-ignore
            expect(sanitizeURL(null)).toBe('');
        });
    });
});
