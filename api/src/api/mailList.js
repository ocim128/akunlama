const mailgun = require('mailgun-js');
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});

// Load banned usernames from environment variable
const getBannedUsernames = () => {
    const bannedUsernamesEnv = process.env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set(); // Return empty set if no banned usernames defined
};

const bannedUsernames = getBannedUsernames();

// IP-based rate limiting storage
const rateLimits = new Map(); // ip -> { usernames: Map, uniqueUsernames: Set, resetTime }

// Rate limiting configuration
const RATE_LIMITS = {
    SAME_USERNAME_PER_MINUTE: 50,      // Same username from same IP
    UNIQUE_USERNAMES_PER_MINUTE: 10,   // Different usernames from same IP  
    TOTAL_REQUESTS_PER_MINUTE: 75,    // Total requests from same IP
    WINDOW_MS: 60000, // 1 minute
    MAX_IPS_TRACKED: 1000,             // Reduced to prevent memory exhaustion
    CLEANUP_INTERVAL: 30000            // Cleanup every 30 seconds
};

// Track last cleanup time to ensure regular memory management
let lastCleanup = Date.now();

// Cleanup old rate limit data to prevent memory leaks
const cleanupRateLimits = () => {
    const now = Date.now();
    const ipsToDelete = [];
    
    rateLimits.forEach((data, ip) => {
        if (now > data.resetTime) {
            ipsToDelete.push(ip);
        }
    });
    
    ipsToDelete.forEach(ip => rateLimits.delete(ip));
    
    // If too many IPs tracked, remove oldest ones aggressively
    if (rateLimits.size > RATE_LIMITS.MAX_IPS_TRACKED) {
        const sortedIPs = Array.from(rateLimits.entries())
            .sort((a, b) => a[1].resetTime - b[1].resetTime)
            .slice(0, Math.floor(RATE_LIMITS.MAX_IPS_TRACKED * 0.8)); // Remove 20% of oldest
        
        sortedIPs.forEach(([ip]) => rateLimits.delete(ip));
        
        console.log(`[MEMORY] Cleaned up ${sortedIPs.length} old IP entries, now tracking ${rateLimits.size} IPs`);
    }
    
    lastCleanup = now;
};

const checkRateLimit = (username, clientIP) => {
    const now = Date.now();
    
    // Input validation
    if (!clientIP || clientIP === 'unknown') {
        throw new Error('Rate limit exceeded: Unable to identify client.');
    }
    
    // Force cleanup every 30 seconds to prevent memory buildup
    if (now - lastCleanup > RATE_LIMITS.CLEANUP_INTERVAL) {
        cleanupRateLimits();
    }
    
    // Get or create IP data
    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, {
            usernames: new Map(),
            uniqueUsernames: new Set(),
            totalRequests: 0,
            resetTime: now + RATE_LIMITS.WINDOW_MS
        });
    }
    
    const ipData = rateLimits.get(clientIP);
    
    // Reset if window expired
    if (now > ipData.resetTime) {
        ipData.usernames.clear();
        ipData.uniqueUsernames.clear();
        ipData.totalRequests = 0;
        ipData.resetTime = now + RATE_LIMITS.WINDOW_MS;
    }
    
    // Check total requests limit for this IP
    if (ipData.totalRequests >= RATE_LIMITS.TOTAL_REQUESTS_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests. Please try again later.');
    }
    
    // Check unique usernames limit for this IP
    if (!ipData.uniqueUsernames.has(username)) {
        if (ipData.uniqueUsernames.size >= RATE_LIMITS.UNIQUE_USERNAMES_PER_MINUTE) {
            throw new Error('Rate limit exceeded: Too many different emails tried. Please try again later.');
        }
        ipData.uniqueUsernames.add(username);
    }
    
    // Check same username limit for this IP
    const usernameCount = ipData.usernames.get(username) || 0;
    if (usernameCount >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests for this email. Please try again later.');
    }
    
    // Update counters
    ipData.usernames.set(username, usernameCount + 1);
    ipData.totalRequests++;
};

const validateUsername = (username) => {
    if (bannedUsernames.has(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    if (!/^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*$/.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters.`);
    }
    return username;
}

// Email filtering system for specific senders and subjects
const shouldFilterEmail = (email) => {
    const fromAddress = (email.sender || email.from || email.message?.headers?.from || '').toLowerCase();
    const subject = (email.subject || email.message?.headers?.subject || '').toLowerCase();
    
    // Blocked sender patterns (using contains/includes for partial matching)
    const blockedSenderPatterns = [
        'registration@facebook',
        'registrations@mail.instagram.com',
        'registration@facebookmail.com',
        'groupupdates@facebookmail.com',
        'reminders@facebookmail.com',
        'friendsuggestion@facebookmail.com',
        'pageupdates@facebookmail.com'
    ];
    
    // Check if sender matches blocked patterns
    for (const pattern of blockedSenderPatterns) {
        if (fromAddress.includes(pattern.toLowerCase())) {
            return true;
        }
    }
    
    // Blocked subject patterns (regex for various confirmation codes)
    const blockedSubjectPatterns = [
        /\d{6}.*adalah kode instagram anda/i,          // Indonesian Instagram code
        /\d{6}.*is your threads code/i,                // Threads code
        /\d{6}.*is your instagram code/i,              // English Instagram code
        /\d{4,6}.*is your confirmation code/i,         // Generic confirmation code
        /fb-\d{4,6}.*is your confirmation code/i       // Facebook confirmation code
    ];
    
    // Check if subject matches blocked patterns
    for (const pattern of blockedSubjectPatterns) {
        if (pattern.test(subject)) {
            return true;
        }
    }
    
    return false;
}



const getEvents = (recipient, res, isAdminAccess = false) => {
    const searchParams = {
        event: 'accepted',
        limit: 300  // CRITICAL: Add limit to ensure consistent results
    };
    
    // If not admin access, filter by specific recipient
    if (!isAdminAccess) {
        searchParams.recipient = `${recipient}@${mailgunConfig.emailDomain}`;
    }
    
    mailgunClient.get('/events', searchParams, (error, body) => {
        if (error) {
            console.error(`Error getting list of messages:`, error);
            return res.status(500).send({
                error: 'Internal Server Error'
            });
        }
        
        let emails = body.items || [];
        
        // Filter by recipient if not admin access
        if (!isAdminAccess) {
            emails = emails.filter(email => {
                const recipientUsername = email.recipient.split('@')[0].toLowerCase();
                return recipientUsername === recipient.toLowerCase();
            });
        }
        
        // Filter out unwanted emails completely and process the rest
        emails = emails
            .filter(email => !shouldFilterEmail(email)) // Remove filtered emails completely
            .map(email => {
                // Add a simplified sender field from envelope.sender if missing
                if (!email.sender && email.envelope?.sender) {
                    email.sender = email.envelope.sender;
                }
                
                // Add recipient username for admin view
                if (isAdminAccess) {
                    email.recipientUser = email.recipient.split('@')[0];
                }
                
                return email; // Return the full original email object
            })
            .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
        
        res.set('Content-Security-Policy', 'default-src \'self\'');
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.status(200).json(emails);
    });
}

module.exports = (req, res) => {
    const recipient = req.query.recipient;
    const clientIP = req.realIP || req.ip || 'unknown';
    
    // Input validation
    if (!recipient || typeof recipient !== 'string') {
        return res.status(400).json({
            error: "Invalid recipient parameter"
        });
    }
    
    // Sanitize input
    const sanitizedRecipient = recipient.trim();
    if (sanitizedRecipient.length === 0 || sanitizedRecipient.length > 100) {
        return res.status(400).json({
            error: "Invalid recipient length"
        });
    }

    // Admin access - retrieve all emails for all users
    if (sanitizedRecipient === mailgunConfig.adminAccessKey) {
        // Security: Log admin access with IP but don't log the key
        console.log(`[ADMIN ACCESS] IP: ${clientIP} - retrieving all emails`);
        
        return getEvents('', res, true); // isAdminAccess = true
    }

    // Legacy support for old API key access
    if (sanitizedRecipient === mailgunConfig.apiKey) {
        console.log(`[LEGACY API ACCESS] IP: ${clientIP}`);
        return getEvents('', res);
    }

    let username = sanitizedRecipient.split('@')[0];
    
    // Block direct domain access
    if (username.toLowerCase() === mailgunConfig.emailDomain.toLowerCase()) {
        return res.status(400).json({
            error: "Invalid username format"
        });
    }

    try {
        // Check IP-based rate limits first
        checkRateLimit(username.toLowerCase(), clientIP);
        
        // Then validate username
        username = validateUsername(username);
    } catch (error) {
        console.error(`[${clientIP}] Rate limit or validation error: ${error.message}`);
        
        // Return appropriate status code based on error type
        if (error.message.includes('Rate limit exceeded')) {
            return res.status(429).json({
                error: 'Too Many Requests',
                message: error.message,
                retryAfter: 60 // seconds
            });
        }
        
        return res.status(400).json({
            error: 'Invalid request',
            message: error.message
        });
    }
    
    getEvents(username, res, false); // isAdminAccess = false
}
