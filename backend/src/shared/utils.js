/**
 * Shared utility functions
 */

/**
 * Decodes Quoted-Printable encoded strings
 * @param {string} str - Encoded string
 * @returns {string} Decoded string
 */
const decodeQuotedPrintable = (str) => {
    if (!str) return '';

    // 1. First, handle soft line breaks (=\r\n, =\n, or =\r)
    // The soft break is an '=' at the end of a line.
    let decoded = str.replace(/=[\r\n]+/g, '');

    // 2. Decode hex values (=XX)
    // We use a regex with a callback to handle non-ASCII properly if needed,
    // but a buffer-based approach is safer for arbitrary bytes.
    try {
        const bytes = [];
        for (let i = 0; i < decoded.length; i++) {
            const char = decoded[i];
            if (char === '=' && i + 2 < decoded.length) {
                const hex = decoded.substring(i + 1, i + 3);
                if (/^[0-9A-F]{2}$/i.test(hex)) {
                    bytes.push(parseInt(hex, 16));
                    i += 2;
                    continue;
                }
            }
            bytes.push(decoded.charCodeAt(i));
        }
        return Buffer.from(bytes).toString('utf-8');
    } catch (e) {
        console.error('Error decoding Quoted-Printable:', e);
        // Fallback to a simpler regex approach if buffer fails
        return decoded.replace(/=([0-9A-F]{2})/gi, (match, hex) => {
            return String.fromCharCode(parseInt(hex, 16));
        });
    }
};

module.exports = {
    decodeQuotedPrintable
};
