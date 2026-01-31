// mime.js - Shared MIME parsing utilities for Cloudflare Email Workers

export const MAX_BODY_LENGTH = 50000;

export const splitHeadersAndBody = (raw) => {
    const crlfIndex = raw.indexOf('\r\n\r\n');
    if (crlfIndex !== -1) {
        return [raw.slice(0, crlfIndex), raw.slice(crlfIndex + 4)];
    }
    const lfIndex = raw.indexOf('\n\n');
    if (lfIndex !== -1) {
        return [raw.slice(0, lfIndex), raw.slice(lfIndex + 2)];
    }
    return [raw, ''];
};

export const parseHeaders = (headerText) => {
    const headers = {};
    if (!headerText) {
        return headers;
    }
    const unfolded = headerText.replace(/\r?\n[ \t]+/g, ' ');
    const lines = unfolded.split(/\r?\n/);
    for (const line of lines) {
        const idx = line.indexOf(':');
        if (idx === -1) continue;
        const name = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        if (!name) continue;
        if (headers[name]) {
            headers[name] = `${headers[name]}, ${value}`;
        } else {
            headers[name] = value;
        }
    }
    return headers;
};

export const parseContentType = (value) => {
    if (!value) return { mime: 'text/plain', params: {} };
    const parts = value.split(';');
    const mime = parts.shift().trim().toLowerCase();
    const params = {};
    for (const part of parts) {
        const eq = part.indexOf('=');
        if (eq === -1) continue;
        const key = part.slice(0, eq).trim().toLowerCase();
        let val = part.slice(eq + 1).trim();
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.slice(1, -1);
        }
        params[key] = val;
    }
    return { mime, params };
};

export const decodeBytes = (bytes, charset) => {
    const cs = (charset || 'utf-8').toLowerCase();
    try {
        return new TextDecoder(cs).decode(bytes);
    } catch (err) {
        return new TextDecoder('utf-8').decode(bytes);
    }
};

export const decodeBase64ToBytes = (input) => {
    const clean = input.replace(/\s+/g, '');
    const bin = atob(clean);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
        bytes[i] = bin.charCodeAt(i);
    }
    return bytes;
};

export const decodeQuotedPrintableToBytes = (input) => {
    const cleaned = input.replace(/=\r?\n/g, '');
    const bytes = [];
    for (let i = 0; i < cleaned.length; i++) {
        const ch = cleaned[i];
        if (ch === '=' && /^[0-9A-Fa-f]{2}$/.test(cleaned.slice(i + 1, i + 3))) {
            bytes.push(parseInt(cleaned.slice(i + 1, i + 3), 16));
            i += 2;
        } else {
            bytes.push(ch.charCodeAt(0));
        }
    }
    return new Uint8Array(bytes);
};

export const decodeContent = (body, encoding, charset) => {
    const enc = (encoding || '').trim().toLowerCase();
    if (enc === 'base64') {
        return decodeBytes(decodeBase64ToBytes(body), charset);
    }
    if (enc === 'quoted-printable' || enc === 'quotedprintable') {
        return decodeBytes(decodeQuotedPrintableToBytes(body), charset);
    }
    return body;
};

export const decodeMimeWords = (value) => {
    if (!value || typeof value !== 'string') return value;
    return value.replace(/=\?([^?]+)\?([bBqQ])\?([^?]*)\?=/g, (match, charset, encoding, text) => {
        const enc = encoding.toUpperCase();
        if (enc === 'B') {
            return decodeBytes(decodeBase64ToBytes(text), charset);
        }
        if (enc === 'Q') {
            const qp = text.replace(/_/g, ' ');
            return decodeBytes(decodeQuotedPrintableToBytes(qp), charset);
        }
        return match;
    });
};

export const parseMultipartBody = (body, boundary) => {
    if (!boundary) return { html: '', text: '' };
    const boundaryText = `--${boundary}`;
    const parts = body.split(boundaryText);
    const htmlParts = [];
    const textParts = [];

    for (let i = 1; i < parts.length; i++) {
        let part = parts[i];
        if (!part) continue;
        if (part.startsWith('--')) break;

        part = part.replace(/^\r?\n/, '');
        const [headerText, partBody] = splitHeadersAndBody(part);
        if (!partBody) continue;

        const headers = parseHeaders(headerText);
        const contentType = parseContentType(headers['content-type']);
        const encoding = headers['content-transfer-encoding'];

        if (contentType.mime.startsWith('multipart/')) {
            const nestedBoundary = contentType.params.boundary;
            if (nestedBoundary) {
                const nested = parseMultipartBody(partBody, nestedBoundary);
                if (nested.html) htmlParts.push(nested.html);
                if (nested.text) textParts.push(nested.text);
            }
            continue;
        }

        if (contentType.mime === 'text/html') {
            htmlParts.push(decodeContent(partBody, encoding, contentType.params.charset));
        } else if (contentType.mime === 'text/plain' || !contentType.mime) {
            textParts.push(decodeContent(partBody, encoding, contentType.params.charset));
        }
    }

    return {
        html: htmlParts.join('\n').trim(),
        text: textParts.join('\n').trim()
    };
};

export const truncate = (value) => {
    if (!value) return '';
    return value.length > MAX_BODY_LENGTH ? value.slice(0, MAX_BODY_LENGTH) : value;
};
