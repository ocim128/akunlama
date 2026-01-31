// mime-extended.test.js - Comprehensive MIME parsing tests
import {
    splitHeadersAndBody,
    parseHeaders,
    parseContentType,
    decodeBytes,
    decodeBase64ToBytes,
    decodeQuotedPrintableToBytes,
    decodeContent,
    decodeMimeWords,
    parseMultipartBody,
    truncate,
    MAX_BODY_LENGTH
} from '../../src/utils/mime.js';
import { expect, test, describe } from 'vitest';

describe('MIME Utils - Extended Tests', () => {
    describe('splitHeadersAndBody', () => {
        test('splits on CRLF separator', () => {
            const raw = 'Header: value\r\n\r\nBody content';
            const [headers, body] = splitHeadersAndBody(raw);
            expect(headers).toBe('Header: value');
            expect(body).toBe('Body content');
        });

        test('splits on LF separator', () => {
            const raw = 'Header: value\n\nBody content';
            const [headers, body] = splitHeadersAndBody(raw);
            expect(headers).toBe('Header: value');
            expect(body).toBe('Body content');
        });

        test('returns empty body when no separator', () => {
            const raw = 'Just headers no separator';
            const [headers, body] = splitHeadersAndBody(raw);
            expect(headers).toBe('Just headers no separator');
            expect(body).toBe('');
        });

        test('handles multiline headers', () => {
            const raw = 'Subject: Test\r\nFrom: sender@test.com\r\n\r\nEmail body here';
            const [headers, body] = splitHeadersAndBody(raw);
            expect(headers).toBe('Subject: Test\r\nFrom: sender@test.com');
            expect(body).toBe('Email body here');
        });
    });

    describe('parseHeaders', () => {
        test('parses simple headers', () => {
            const raw = 'From: sender@example.com\r\nSubject: Test Email';
            const headers = parseHeaders(raw);
            expect(headers['from']).toBe('sender@example.com');
            expect(headers['subject']).toBe('Test Email');
        });

        test('handles folded headers (continuation)', () => {
            const raw = 'Subject: This is a very long\r\n subject that spans lines';
            const headers = parseHeaders(raw);
            expect(headers['subject']).toBe('This is a very long subject that spans lines');
        });

        test('handles empty header text', () => {
            const headers = parseHeaders('');
            expect(headers).toEqual({});
        });

        test('handles null header text', () => {
            const headers = parseHeaders(null);
            expect(headers).toEqual({});
        });

        test('combines duplicate headers', () => {
            const raw = 'Received: first hop\r\nReceived: second hop';
            const headers = parseHeaders(raw);
            expect(headers['received']).toBe('first hop, second hop');
        });

        test('converts header names to lowercase', () => {
            const raw = 'Content-Type: text/html\r\nX-Custom-HEADER: value';
            const headers = parseHeaders(raw);
            expect(headers['content-type']).toBe('text/html');
            expect(headers['x-custom-header']).toBe('value');
        });

        test('skips lines without colon', () => {
            const raw = 'From: sender@test.com\r\nInvalid line\r\nSubject: Test';
            const headers = parseHeaders(raw);
            expect(headers['from']).toBe('sender@test.com');
            expect(headers['subject']).toBe('Test');
            expect(Object.keys(headers).length).toBe(2);
        });
    });

    describe('parseContentType', () => {
        test('parses simple content type', () => {
            const result = parseContentType('text/plain');
            expect(result.mime).toBe('text/plain');
            expect(result.params).toEqual({});
        });

        test('parses content type with charset', () => {
            const result = parseContentType('text/html; charset=UTF-8');
            expect(result.mime).toBe('text/html');
            expect(result.params.charset).toBe('UTF-8');
        });

        test('parses content type with boundary', () => {
            const result = parseContentType('multipart/alternative; boundary="----=_Part_123"');
            expect(result.mime).toBe('multipart/alternative');
            expect(result.params.boundary).toBe('----=_Part_123');
        });

        test('handles quoted parameter values', () => {
            const result = parseContentType('text/plain; charset="iso-8859-1"');
            expect(result.params.charset).toBe('iso-8859-1');
        });

        test('handles missing content type', () => {
            const result = parseContentType(null);
            expect(result.mime).toBe('text/plain');
            expect(result.params).toEqual({});
        });

        test('handles undefined content type', () => {
            const result = parseContentType(undefined);
            expect(result.mime).toBe('text/plain');
            expect(result.params).toEqual({});
        });

        test('handles multiple parameters', () => {
            const result = parseContentType('multipart/mixed; boundary="abc"; charset=utf-8');
            expect(result.mime).toBe('multipart/mixed');
            expect(result.params.boundary).toBe('abc');
            expect(result.params.charset).toBe('utf-8');
        });
    });

    describe('decodeBase64ToBytes', () => {
        test('decodes simple base64', () => {
            // "Hello" in base64
            const bytes = decodeBase64ToBytes('SGVsbG8=');
            const text = new TextDecoder().decode(bytes);
            expect(text).toBe('Hello');
        });

        test('handles whitespace in base64', () => {
            const bytes = decodeBase64ToBytes('SGVs\n  bG8=');
            const text = new TextDecoder().decode(bytes);
            expect(text).toBe('Hello');
        });

        test('decodes UTF-8 characters', () => {
            // "日本語" in base64
            const bytes = decodeBase64ToBytes('5pel5pys6Kqe');
            const text = new TextDecoder('utf-8').decode(bytes);
            expect(text).toBe('日本語');
        });
    });

    describe('decodeQuotedPrintableToBytes', () => {
        test('decodes simple quoted-printable', () => {
            const bytes = decodeQuotedPrintableToBytes('Hello=20World');
            const text = new TextDecoder().decode(bytes);
            expect(text).toBe('Hello World');
        });

        test('handles soft line breaks', () => {
            const bytes = decodeQuotedPrintableToBytes('Hello=\r\nWorld');
            const text = new TextDecoder().decode(bytes);
            expect(text).toBe('HelloWorld');
        });

        test('decodes special characters', () => {
            const bytes = decodeQuotedPrintableToBytes('Caf=C3=A9');
            const text = new TextDecoder('utf-8').decode(bytes);
            expect(text).toBe('Café');
        });

        test('passes through regular characters', () => {
            const bytes = decodeQuotedPrintableToBytes('Normal text');
            const text = new TextDecoder().decode(bytes);
            expect(text).toBe('Normal text');
        });
    });

    describe('decodeContent', () => {
        test('decodes base64 content', () => {
            const result = decodeContent('SGVsbG8gV29ybGQ=', 'base64', 'utf-8');
            expect(result).toBe('Hello World');
        });

        test('decodes quoted-printable content', () => {
            const result = decodeContent('Hello=20World', 'quoted-printable', 'utf-8');
            expect(result).toBe('Hello World');
        });

        test('returns raw content for unknown encoding', () => {
            const result = decodeContent('Raw content', '7bit', 'utf-8');
            expect(result).toBe('Raw content');
        });

        test('handles empty encoding', () => {
            const result = decodeContent('Plain text', '', 'utf-8');
            expect(result).toBe('Plain text');
        });

        test('handles null encoding', () => {
            const result = decodeContent('Plain text', null, 'utf-8');
            expect(result).toBe('Plain text');
        });

        test('handles quotedprintable without hyphen', () => {
            const result = decodeContent('Test=20text', 'quotedprintable', 'utf-8');
            expect(result).toBe('Test text');
        });
    });

    describe('decodeMimeWords', () => {
        test('decodes UTF-8 base64 encoded words', () => {
            const encoded = '=?UTF-8?B?SGVsbG8=?=';
            expect(decodeMimeWords(encoded)).toBe('Hello');
        });

        test('decodes UTF-8 quoted-printable encoded words', () => {
            const encoded = '=?UTF-8?Q?Hello_World?=';
            expect(decodeMimeWords(encoded)).toBe('Hello World');
        });

        test('decodes ISO-8859-1 encoded words', () => {
            // "Café" with é encoded
            const encoded = '=?ISO-8859-1?Q?Caf=E9?=';
            const result = decodeMimeWords(encoded);
            expect(result).toBe('Café');
        });

        test('handles multiple encoded words', () => {
            const encoded = '=?UTF-8?B?SGVsbG8=?= =?UTF-8?B?V29ybGQ=?=';
            expect(decodeMimeWords(encoded)).toBe('Hello World');
        });

        test('preserves non-encoded text', () => {
            const plain = 'Plain text subject';
            expect(decodeMimeWords(plain)).toBe('Plain text subject');
        });

        test('handles mixed encoded and plain text', () => {
            const mixed = 'Re: =?UTF-8?B?SGVsbG8=?= message';
            expect(decodeMimeWords(mixed)).toBe('Re: Hello message');
        });

        test('handles null input', () => {
            expect(decodeMimeWords(null)).toBe(null);
        });

        test('handles empty string', () => {
            expect(decodeMimeWords('')).toBe('');
        });

        test('handles non-string input', () => {
            expect(decodeMimeWords(123)).toBe(123);
        });
    });

    describe('parseMultipartBody', () => {
        test('extracts text/html part', () => {
            const boundary = '----=_Part_123';
            const body = `------=_Part_123\r
Content-Type: text/html; charset=utf-8\r
\r
<p>Hello World</p>\r
------=_Part_123--`;

            const result = parseMultipartBody(body, boundary);
            expect(result.html).toContain('Hello World');
        });

        test('extracts text/plain part', () => {
            const boundary = '----=_Part_456';
            const body = `------=_Part_456\r
Content-Type: text/plain; charset=utf-8\r
\r
Plain text content\r
------=_Part_456--`;

            const result = parseMultipartBody(body, boundary);
            expect(result.text).toBe('Plain text content');
        });

        test('extracts both html and text parts', () => {
            const boundary = 'boundary123';
            const body = `--boundary123\r
Content-Type: text/plain\r
\r
Plain version\r
--boundary123\r
Content-Type: text/html\r
\r
<b>HTML version</b>\r
--boundary123--`;

            const result = parseMultipartBody(body, boundary);
            expect(result.text).toBe('Plain version');
            expect(result.html).toContain('HTML version');
        });

        test('handles empty boundary', () => {
            const result = parseMultipartBody('some body', '');
            expect(result).toEqual({ html: '', text: '' });
        });

        test('handles null boundary', () => {
            const result = parseMultipartBody('some body', null);
            expect(result).toEqual({ html: '', text: '' });
        });

        test('handles base64 encoded part', () => {
            const boundary = 'test';
            const body = `--test\r
Content-Type: text/plain\r
Content-Transfer-Encoding: base64\r
\r
SGVsbG8gV29ybGQ=\r
--test--`;

            const result = parseMultipartBody(body, boundary);
            expect(result.text).toBe('Hello World');
        });
    });

    describe('truncate', () => {
        test('returns original text if under limit', () => {
            const text = 'Short text';
            expect(truncate(text)).toBe('Short text');
        });

        test('truncates text exceeding MAX_BODY_LENGTH', () => {
            const longText = 'a'.repeat(MAX_BODY_LENGTH + 1000);
            const result = truncate(longText);
            expect(result.length).toBe(MAX_BODY_LENGTH);
        });

        test('returns empty string for null', () => {
            expect(truncate(null)).toBe('');
        });

        test('returns empty string for undefined', () => {
            expect(truncate(undefined)).toBe('');
        });

        test('returns empty string for empty input', () => {
            expect(truncate('')).toBe('');
        });
    });

    describe('decodeBytes', () => {
        test('decodes UTF-8 bytes correctly', () => {
            const bytes = new TextEncoder().encode('Hello 世界');
            expect(decodeBytes(bytes, 'utf-8')).toBe('Hello 世界');
        });

        test('falls back to UTF-8 for unknown charset', () => {
            const bytes = new TextEncoder().encode('Hello');
            // Should not throw, falls back to utf-8
            expect(decodeBytes(bytes, 'unknown-charset')).toBe('Hello');
        });

        test('defaults to UTF-8 when charset is null', () => {
            const bytes = new TextEncoder().encode('Test');
            expect(decodeBytes(bytes, null)).toBe('Test');
        });
    });
});
