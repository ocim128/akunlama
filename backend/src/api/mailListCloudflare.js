// Cloudflare Email API - replaces Mailgun mailList.js
const { axiosClient } = require('../shared/axiosClient');
const cloudflareConfig = require("../../config/cloudflareConfig");

// Import shared modules to reduce code duplication
const { getCachedEmails, cacheEmails } = require('../shared/emailCache');
const { checkRateLimit } = require('../shared/rateLimit');
const { validateUsername, shouldFilterEmail } = require('../shared/emailFilter');

/**
 * Set security response headers
 * @param {Object} res Express response
 * @param {boolean} cacheHit Whether the response is from cache
 */
const setSecurityHeaders = (res, cacheHit) => {
    res.set('Content-Security-Policy', "default-src 'self'");
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');
    res.set('X-Cache', cacheHit ? 'HIT' : 'MISS');
};

/**
 * Fetch emails from Cloudflare API
 * @param {string} recipient 
 * @param {Object} res Express response
 * @param {boolean} isAdminAccess 
 */
const getEvents = async (recipient, res, isAdminAccess = false) => {
    // Check cache first
    const cachedEmails = getCachedEmails(recipient, isAdminAccess);
    if (cachedEmails) {
        console.log(`[CACHE] Using cached emails for ${recipient}`);
        setSecurityHeaders(res, true);
        return res.status(200).json(cachedEmails);
    }

    try {
        // For admin access, use '*' wildcard AND pass admin_key for authentication
        const recipientParam = isAdminAccess ? '*' : `${recipient}@${cloudflareConfig.emailDomain}`;
        let apiUrl = `${cloudflareConfig.apiUrl}/api/events?recipient=${encodeURIComponent(recipientParam)}`;

        // Add admin_key for authenticated admin access
        if (isAdminAccess && cloudflareConfig.adminAccessKey) {
            apiUrl += `&admin_key=${encodeURIComponent(cloudflareConfig.adminAccessKey)}`;
        }

        console.log(`[CLOUDFLARE] Fetching emails: ${isAdminAccess ? 'ADMIN (authenticated)' : recipient}`);
        const response = await axiosClient.get(apiUrl, { timeout: 10000 });

        let emails = response.data.items || [];

        // Filter by exact recipient match
        if (!isAdminAccess && recipient) {
            emails = emails.filter(email => {
                const recipientUsername = (email.message?.headers?.to || '').split('@')[0].toLowerCase();
                return recipientUsername === recipient.toLowerCase();
            });
        }

        // Transform to match frontend expectations
        emails = emails
            .filter(email => !shouldFilterEmail(email))
            .map(email => ({
                id: email.id,
                timestamp: email.timestamp,
                event: email.event || 'stored',
                recipient: email.message?.headers?.to || '',
                sender: email.message?.headers?.from || '',
                subject: email.message?.headers?.subject || '',
                storage: {
                    key: email.id,
                    region: 'cf'
                },
                message: email.message,
                recipientUser: isAdminAccess ? (email.message?.headers?.to || '').split('@')[0] : undefined
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        // Cache the results
        cacheEmails(recipient, isAdminAccess, emails);

        setSecurityHeaders(res, false);
        res.status(200).json(emails);

    } catch (error) {
        console.error(`Error getting list of messages from Cloudflare:`, error.message);

        if (error.response?.status === 429) {
            console.log(`[RATE LIMIT] Cloudflare API limit hit`);
            return res.status(200).json([]);
        }

        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = (req, res) => {
    const recipient = req.query.recipient;
    const clientIP = req.realIP || req.ip || 'unknown';

    // Input validation
    if (!recipient || typeof recipient !== 'string') {
        return res.status(400).json({ error: "Invalid recipient parameter" });
    }

    const sanitizedRecipient = recipient.trim();
    if (sanitizedRecipient.length === 0 || sanitizedRecipient.length > 100) {
        return res.status(400).json({ error: "Invalid recipient length" });
    }

    // Admin access
    if (sanitizedRecipient === cloudflareConfig.adminAccessKey) {
        console.log(`[ADMIN ACCESS] IP: ${clientIP}`);
        return getEvents('', res, true);
    }

    let username = sanitizedRecipient.split('@')[0];

    if (username.toLowerCase() === cloudflareConfig.emailDomain.toLowerCase()) {
        return res.status(400).json({ error: "Invalid username format" });
    }

    try {
        checkRateLimit(username.toLowerCase(), clientIP);
        username = validateUsername(username);
    } catch (error) {
        console.error(`[${clientIP}] Rate limit or validation error: ${error.message}`);

        if (error.message.includes('Too many different emails tried')) {
            console.log(`[RATE LIMIT] Redirecting aggressive user ${clientIP}`);
            return res.redirect(302, 'https://sin-speed.hetzner.com/10GB.bin');
        }

        return res.status(400).json({
            error: 'Invalid request',
            message: error.message
        });
    }

    getEvents(username, res, false);
};
