// mime.test.js
import { parseHeaders, decodeMimeWords } from '../../src/utils/mime.js';
import { expect, test, describe } from 'vitest';

describe('MIME Utils', () => {
    test('parseHeaders parses simple headers', () => {
        const raw = 'From: sender@example.com\r\nSubject: Test Email';
        const headers = parseHeaders(raw);
        expect(headers['from']).toBe('sender@example.com');
        expect(headers['subject']).toBe('Test Email');
    });

    test('decodeMimeWords decodes UTF-8 base64', () => {
        // "Hello" in base64 is SGVsbG8=
        const encoded = '=?UTF-8?B?SGVsbG8=?=';
        expect(decodeMimeWords(encoded)).toBe('Hello');
    });
});
