// Cloudflare Email API - replaces Mailgun mailList.js
const axios = require('axios');
const cloudflareConfig = require("../../config/cloudflareConfig");
const cacheControl = require("../../config/cacheControl");

// Simple in-memory cache for email lists to reduce API calls
const emailCache = new Map();
const CACHE_TTL = 5000; // 5 seconds cache
const MAX_CACHE_SIZE = 1000;

// Cache management functions
const getCacheKey = (recipient, isAdminAccess) => {
    return `${isAdminAccess ? 'admin' : 'user'}:${recipient}`;
};

const getCachedEmails = (recipient, isAdminAccess) => {
    const cacheKey = getCacheKey(recipient, isAdminAccess);
    const cached = emailCache.get(cacheKey);

    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_TTL) {
        emailCache.delete(cacheKey);
        return null;
    }

    return cached.emails;
};

const cacheEmails = (recipient, isAdminAccess, emails) => {
    const cacheKey = getCacheKey(recipient, isAdminAccess);

    if (emailCache.size >= MAX_CACHE_SIZE) {
        const entriesToRemove = Array.from(emailCache.entries())
            .sort((a, b) => a[1].timestamp - b[1].timestamp)
            .slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));

        entriesToRemove.forEach(([key]) => emailCache.delete(key));
    }

    emailCache.set(cacheKey, {
        emails,
        timestamp: Date.now()
    });
};

// Load banned usernames from environment variable
const getBannedUsernames = () => {
    const bannedUsernamesEnv = process.env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set();
};

const bannedUsernames = getBannedUsernames();

// Rate limiting
const rateLimits = new Map();
const RATE_LIMITS = {
    TOTAL_REQUESTS_PER_MINUTE: 75,
    UNIQUE_USERNAMES_PER_MINUTE: 10,
    SAME_USERNAME_PER_MINUTE: 50,
    WINDOW_MS: 60000,
    MAX_IPS_TRACKED: 500,
    CLEANUP_INTERVAL: 60000
};

let lastCleanup = Date.now();

const cleanupRateLimits = () => {
    const now = Date.now();
    const ipsToDelete = [];

    rateLimits.forEach((data, ip) => {
        if (now > data.resetTime) {
            ipsToDelete.push(ip);
        }
    });

    ipsToDelete.forEach(ip => rateLimits.delete(ip));

    if (rateLimits.size > RATE_LIMITS.MAX_IPS_TRACKED) {
        const sortedIPs = Array.from(rateLimits.entries())
            .sort((a, b) => a[1].resetTime - b[1].resetTime)
            .slice(0, Math.floor(RATE_LIMITS.MAX_IPS_TRACKED * 0.7));

        sortedIPs.forEach(([ip]) => rateLimits.delete(ip));
    }

    lastCleanup = now;
};

const checkRateLimit = (username, clientIP) => {
    const now = Date.now();

    if (!clientIP || clientIP === 'unknown') {
        throw new Error('Rate limit exceeded: Unable to identify client.');
    }

    if (now - lastCleanup > RATE_LIMITS.CLEANUP_INTERVAL) {
        cleanupRateLimits();
    }

    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, {
            requestTimestamps: [],
            uniqueUsernames: new Set(),
            resetTime: now + RATE_LIMITS.WINDOW_MS
        });
    }

    const ipData = rateLimits.get(clientIP);

    if (now > ipData.resetTime) {
        ipData.requestTimestamps = [];
        ipData.uniqueUsernames.clear();
        ipData.resetTime = now + RATE_LIMITS.WINDOW_MS;
    }

    const windowStart = now - RATE_LIMITS.WINDOW_MS;
    ipData.requestTimestamps = ipData.requestTimestamps.filter(timestamp => timestamp > windowStart);

    if (ipData.requestTimestamps.length >= RATE_LIMITS.TOTAL_REQUESTS_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests. Please try again later.');
    }

    if (!ipData.uniqueUsernames.has(username)) {
        if (ipData.uniqueUsernames.size >= RATE_LIMITS.UNIQUE_USERNAMES_PER_MINUTE) {
            throw new Error('Rate limit exceeded: Too many different emails tried. Please try again later.');
        }
        ipData.uniqueUsernames.add(username);
    }

    const recentUsernameRequests = ipData.requestTimestamps.filter((timestamp, index) => {
        return index >= ipData.requestTimestamps.length - RATE_LIMITS.SAME_USERNAME_PER_MINUTE;
    });

    if (recentUsernameRequests.length >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests for this email. Please try again later.');
    }

    ipData.requestTimestamps.push(now);
};

const validateUsername = (username) => {
    if (bannedUsernames.has(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!regex.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters.`);
    }
    return username;
}

// Email filtering system
const shouldFilterEmail = (email) => {
    const fromAddress = (email.sender || email.from || email.message?.headers?.from || '').toLowerCase();
    const subject = (email.subject || email.message?.headers?.subject || '').toLowerCase();

    const blockedSenderPatterns = [
        'registration@facebook',
        'registrations@mail.instagram.com',
        'registration@facebookmail.com',
        'groupupdates@facebookmail.com',
        'reminders@facebookmail.com',
        'friendsuggestion@facebookmail.com',
        'pageupdates@facebookmail.com'
    ];

    for (const pattern of blockedSenderPatterns) {
        if (fromAddress.includes(pattern.toLowerCase())) {
            return true;
        }
    }

    const blockedSubjectPatterns = [
        /\d{6}.*adalah kode instagram anda/i,
        /\d{6}.*is your threads code/i,
        /\d{6}.*is your instagram code/i,
        /\d{4,6}.*is your confirmation code/i,
        /fb-\d{4,6}.*is your confirmation code/i
    ];

    for (const pattern of blockedSubjectPatterns) {
        if (pattern.test(subject)) {
            return true;
        }
    }

    return false;
}

// Fetch emails from Cloudflare API
const getEvents = async (recipient, res, isAdminAccess = false) => {
    // Check cache first
    const cachedEmails = getCachedEmails(recipient, isAdminAccess);
    if (cachedEmails) {
        console.log(`[CACHE] Using cached emails for ${recipient}`);
        res.set('Content-Security-Policy', "default-src 'self'");
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.set('X-Cache', 'HIT');
        return res.status(200).json(cachedEmails);
    }

    try {
        // Build the full email address
        const fullEmail = isAdminAccess ? '' : `${recipient}@${cloudflareConfig.emailDomain}`;

        // Call Cloudflare Worker API
        const apiUrl = `${cloudflareConfig.apiUrl}/api/events?recipient=${encodeURIComponent(fullEmail)}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        let emails = response.data.items || [];

        // Filter by recipient if not admin access
        if (!isAdminAccess && recipient) {
            emails = emails.filter(email => {
                const recipientUsername = (email.message?.headers?.to || '').split('@')[0].toLowerCase();
                return recipientUsername === recipient.toLowerCase();
            });
        }

        // Transform to match existing frontend expectations
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
                    region: 'cf' // Cloudflare identifier
                },
                message: email.message,
                // For admin view
                recipientUser: isAdminAccess ? (email.message?.headers?.to || '').split('@')[0] : undefined
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        // Cache the results
        cacheEmails(recipient, isAdminAccess, emails);

        res.set('Content-Security-Policy', "default-src 'self'");
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.set('X-Cache', 'MISS');
        res.status(200).json(emails);

    } catch (error) {
        console.error(`Error getting list of messages from Cloudflare:`, error.message);

        if (error.response?.status === 429) {
            console.log(`[RATE LIMIT] Cloudflare API limit hit`);
            return res.status(200).json([]);
        }

        return res.status(500).send({
            error: 'Internal Server Error'
        });
    }
}

module.exports = (req, res) => {
    const recipient = req.query.recipient;
    const clientIP = req.realIP || req.ip || 'unknown';

    if (!recipient || typeof recipient !== 'string') {
        return res.status(400).json({
            error: "Invalid recipient parameter"
        });
    }

    const sanitizedRecipient = recipient.trim();
    if (sanitizedRecipient.length === 0 || sanitizedRecipient.length > 100) {
        return res.status(400).json({
            error: "Invalid recipient length"
        });
    }

    // Admin access
    if (sanitizedRecipient === cloudflareConfig.adminAccessKey) {
        console.log(`[ADMIN ACCESS] IP: ${clientIP} - retrieving all emails`);
        return getEvents('', res, true);
    }

    let username = sanitizedRecipient.split('@')[0];

    if (username.toLowerCase() === cloudflareConfig.emailDomain.toLowerCase()) {
        return res.status(400).json({
            error: "Invalid username format"
        });
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
}
