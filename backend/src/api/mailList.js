const mailgun = require('mailgun-js');
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");

// Import shared modules to reduce code duplication
const { getCachedEmails, cacheEmails } = require('../shared/emailCache');
const { checkRateLimit } = require('../shared/rateLimit');
const { validateUsername } = require('../shared/emailFilter');
// Note: For Cloudflare setup, email filtering happens at Worker level

const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});

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
 * Get emails for a recipient
 * @param {string} recipient 
 * @param {Object} res Express response
 * @param {boolean} isAdminAccess 
 */
const getEvents = (recipient, res, isAdminAccess = false) => {
    // Check cache first
    const cachedEmails = getCachedEmails(recipient, isAdminAccess);
    if (cachedEmails) {
        console.log(`[CACHE] Using cached emails for ${recipient}`);
        setSecurityHeaders(res, true);
        return res.status(200).json(cachedEmails);
    }

    const searchParams = {
        event: 'accepted',
        limit: 300
    };

    // Filter by specific recipient for non-admin access
    if (!isAdminAccess) {
        let queryRecipient = recipient;
        if (queryRecipient.endsWith('_')) {
            queryRecipient = queryRecipient.slice(0, -1);
        }
        searchParams.recipient = `${queryRecipient}@${mailgunConfig.emailDomain}`;
    }

    mailgunClient.get('/events', searchParams, (error, body) => {
        if (error) {
            console.error(`Error getting list of messages:`, error);

            // Handle Mailgun rate limiting gracefully
            if (error.statusCode === 429) {
                console.log(`[MAILGUN RATE LIMIT] Mailgun API limit hit`);
                return res.status(200).json([]);
            }

            return res.status(500).json({ error: 'Internal Server Error' });
        }

        let emails = body.items || [];

        // Filter by exact recipient match
        if (!isAdminAccess) {
            emails = emails.filter(email => {
                const recipientUsername = email.recipient.split('@')[0].toLowerCase();
                return recipientUsername === recipient.toLowerCase();
            });
        }

        // Process emails
        emails = emails
            .map(email => {
                // Add sender from envelope if missing
                if (!email.sender && email.envelope?.sender) {
                    email.sender = email.envelope.sender;
                }
                // Add recipient username for admin view
                if (isAdminAccess) {
                    email.recipientUser = email.recipient.split('@')[0];
                }
                return email;
            })
            .sort((a, b) => b.timestamp - a.timestamp);

        // Cache the results
        cacheEmails(recipient, isAdminAccess, emails);

        setSecurityHeaders(res, false);
        res.status(200).json(emails);
    });
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
    if (sanitizedRecipient === mailgunConfig.adminAccessKey) {
        console.log(`[ADMIN ACCESS] IP: ${clientIP}`);
        return getEvents('', res, true);
    }

    // Legacy API key access
    if (sanitizedRecipient === mailgunConfig.apiKey) {
        console.log(`[LEGACY API ACCESS] IP: ${clientIP}`);
        return getEvents('', res);
    }

    let username = sanitizedRecipient.split('@')[0];

    // Block direct domain access
    if (username.toLowerCase() === mailgunConfig.emailDomain.toLowerCase()) {
        return res.status(400).json({ error: "Invalid username format" });
    }

    try {
        checkRateLimit(username.toLowerCase(), clientIP);
        username = validateUsername(username);
    } catch (error) {
        console.error(`[${clientIP}] Rate limit or validation error: ${error.message}`);

        // Redirect aggressive users to waste their resources
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
