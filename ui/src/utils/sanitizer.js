/**
 * HTML Sanitization Utility
 * 
 * Uses DOMPurify to safely sanitize HTML content from emails
 * preventing XSS attacks and malicious scripts.
 */
import DOMPurify from 'dompurify';

// Configure DOMPurify with sensible defaults for email content
const DEFAULT_CONFIG = {
    // Allow common HTML tags used in emails
    ALLOWED_TAGS: [
        'a', 'abbr', 'article', 'aside', 'b', 'blockquote', 'br', 'caption',
        'center', 'cite', 'code', 'col', 'colgroup', 'dd', 'del', 'details',
        'dfn', 'div', 'dl', 'dt', 'em', 'figcaption', 'figure', 'footer',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'i', 'img',
        'ins', 'kbd', 'li', 'main', 'mark', 'nav', 'ol', 'p', 'pre',
        'q', 's', 'samp', 'section', 'small', 'span', 'strike', 'strong',
        'sub', 'summary', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th',
        'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr'
    ],

    // Allow safe attributes
    ALLOWED_ATTR: [
        'align', 'alt', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
        'class', 'color', 'colspan', 'dir', 'height', 'href', 'id', 'lang',
        'rowspan', 'src', 'style', 'target', 'title', 'valign', 'width'
    ],

    // Explicitly forbid dangerous tags
    FORBID_TAGS: [
        'script', 'iframe', 'embed', 'object', 'form', 'input', 'button',
        'textarea', 'select', 'meta', 'link', 'base', 'applet', 'frame',
        'frameset', 'svg', 'math'
    ],

    // Forbid dangerous attributes
    FORBID_ATTR: [
        'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
        'onfocus', 'onblur', 'onsubmit', 'onchange', 'onkeydown',
        'onkeypress', 'onkeyup', 'formaction', 'xlink:href'
    ],

    // Always force links to open in new tab
    ADD_ATTR: ['target'],

    // Don't modify the DOM node during sanitization
    WHOLE_DOCUMENT: false,

    // Return string, not DOM node
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,

    // Allow data URLs for images (common in emails)
    ALLOW_DATA_ATTR: true,

    // Force HTTPS for external resources when possible
    FORCE_HTTPS: true
};

// Hook to force all links to open in new tab
DOMPurify.addHook('afterSanitizeAttributes', function (node) {
    // Force links to open in new tab
    if (node.tagName === 'A') {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer');
    }

    // Force images to have alt text for accessibility
    if (node.tagName === 'IMG' && !node.getAttribute('alt')) {
        node.setAttribute('alt', 'Email image');
    }
});

/**
 * Sanitize HTML content from emails
 * @param {string} html - Raw HTML content
 * @param {object} customConfig - Optional custom DOMPurify config
 * @returns {string} Sanitized HTML
 */
export function sanitizeEmailHTML(html, customConfig = {}) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const config = { ...DEFAULT_CONFIG, ...customConfig };
    return DOMPurify.sanitize(html, config);
}

/**
 * Sanitize plain text content (escape HTML entities)
 * @param {string} text - Raw text content
 * @returns {string} Escaped text safe for display
 */
export function sanitizeText(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Strip all HTML tags, keeping only text content
 * @param {string} html - HTML content
 * @returns {string} Plain text without HTML
 */
export function stripHTML(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    return DOMPurify.sanitize(html, { ALLOWED_TAGS: [] });
}

/**
 * Check if content contains potentially dangerous patterns
 * @param {string} content - Content to check
 * @returns {object} Result with isDangerous flag and detected patterns
 */
export function detectDangerousPatterns(content) {
    if (!content || typeof content !== 'string') {
        return { isDangerous: false, patterns: [] };
    }

    const dangerousPatterns = [
        { name: 'script', pattern: /<script[\s\S]*?>/gi },
        { name: 'javascript', pattern: /javascript:/gi },
        { name: 'vbscript', pattern: /vbscript:/gi },
        { name: 'onEvent', pattern: /on\w+\s*=/gi },
        { name: 'dataURI', pattern: /data:text\/html/gi },
        { name: 'iframe', pattern: /<iframe[\s\S]*?>/gi },
        { name: 'embed', pattern: /<embed[\s\S]*?>/gi },
        { name: 'object', pattern: /<object[\s\S]*?>/gi },
        { name: 'form', pattern: /<form[\s\S]*?>/gi },
        { name: 'meta', pattern: /<meta[\s\S]*?>/gi },
        { name: 'expression', pattern: /expression\s*\(/gi }
    ];

    const detectedPatterns = [];

    for (const { name, pattern } of dangerousPatterns) {
        if (pattern.test(content)) {
            detectedPatterns.push(name);
        }
    }

    return {
        isDangerous: detectedPatterns.length > 0,
        patterns: detectedPatterns
    };
}

/**
 * Sanitize URL to prevent javascript: and other dangerous protocols
 * @param {string} url - URL to sanitize
 * @returns {string} Safe URL or empty string
 */
export function sanitizeURL(url) {
    if (!url || typeof url !== 'string') {
        return '';
    }

    const trimmedUrl = url.trim().toLowerCase();

    // Block dangerous protocols
    const dangerousProtocols = [
        'javascript:',
        'vbscript:',
        'data:text/html',
        'data:application',
        'file:'
    ];

    for (const protocol of dangerousProtocols) {
        if (trimmedUrl.startsWith(protocol)) {
            console.warn(`Blocked dangerous URL protocol: ${protocol}`);
            return '';
        }
    }

    return url;
}

export default {
    sanitizeEmailHTML,
    sanitizeText,
    stripHTML,
    detectDangerousPatterns,
    sanitizeURL
};
