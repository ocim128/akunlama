/**
 * Server-side HTML Sanitization Utility
 * 
 * Uses DOMPurify with jsdom to safely sanitize HTML content from emails
 * on the server side, preventing XSS attacks before sending to clients.
 */
const { JSDOM } = require('jsdom');
const createDOMPurify = require('dompurify');

// Create a DOM window for DOMPurify to use on the server
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

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
        'thead', 'time', 'tr', 'u', 'ul', 'var', 'wbr',
        // Allow document structure for complete HTML emails
        'html', 'head', 'body', 'style', 'title'
    ],

    // Allow safe attributes
    ALLOWED_ATTR: [
        'align', 'alt', 'bgcolor', 'border', 'cellpadding', 'cellspacing',
        'class', 'color', 'colspan', 'dir', 'height', 'href', 'id', 'lang',
        'rowspan', 'src', 'style', 'target', 'title', 'valign', 'width',
        'type', 'media', 'charset'
    ],

    // Explicitly forbid dangerous tags
    FORBID_TAGS: [
        'script', 'iframe', 'embed', 'object', 'form', 'input', 'button',
        'textarea', 'select', 'meta', 'link', 'base', 'applet', 'frame',
        'frameset', 'svg', 'math', 'audio', 'video', 'source', 'track'
    ],

    // Forbid dangerous attributes
    FORBID_ATTR: [
        'onerror', 'onload', 'onclick', 'onmouseover', 'onmouseout',
        'onfocus', 'onblur', 'onsubmit', 'onchange', 'onkeydown',
        'onkeypress', 'onkeyup', 'formaction', 'xlink:href', 'action',
        'srcdoc', 'data'
    ],

    // Keep the document structure
    WHOLE_DOCUMENT: true,

    // Return string
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,

    // Allow data URLs for images (common in emails)
    ALLOW_DATA_ATTR: true
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
function sanitizeEmailHTML(html, customConfig = {}) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    const config = { ...DEFAULT_CONFIG, ...customConfig };

    try {
        return DOMPurify.sanitize(html, config);
    } catch (error) {
        console.error('[SANITIZE] Error sanitizing HTML:', error.message);
        // Return safe fallback
        return sanitizeText(html);
    }
}

/**
 * Sanitize plain text content (escape HTML entities)
 * @param {string} text - Raw text content
 * @returns {string} Escaped text safe for display
 */
function sanitizeText(text) {
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
 * Check if content contains potentially dangerous patterns
 * @param {string} content - Content to check
 * @returns {object} Result with isDangerous flag and detected patterns
 */
function detectDangerousPatterns(content) {
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

module.exports = {
    sanitizeEmailHTML,
    sanitizeText,
    detectDangerousPatterns
};
