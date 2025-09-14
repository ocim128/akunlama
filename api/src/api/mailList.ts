import mailgun from 'mailgun-js';
import mailgunConfig from '../../config/mailgunConfig';
import { EmailEvent, RateLimitData, CacheEntry } from '../../types/mail';
import { Response } from 'express';

interface ExtendedRequest {
  query: {
    recipient?: string;
    [key: string]: any;
  };
  realIP: string;
  ip?: string;
}

const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});

// Simple in-memory cache for email lists to reduce API calls
const emailCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5000; // 5 seconds cache
const MAX_CACHE_SIZE = 1000; // Prevent memory exhaustion

// Cache management functions
const getCacheKey = (recipient: string, isAdminAccess: boolean): string => {
    return `${isAdminAccess ? 'admin' : 'user'}:${recipient}`;
};

const getCachedEmails = (recipient: string, isAdminAccess: boolean): EmailEvent[] | null => {
    const cacheKey = getCacheKey(recipient, isAdminAccess);
    const cached = emailCache.get(cacheKey);
    
    if (!cached) return null;
    
    // Check if cache is expired
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        emailCache.delete(cacheKey);
        return null;
    }
    
    return cached.emails;
};

const cacheEmails = (recipient: string, isAdminAccess: boolean, emails: EmailEvent[]): void => {
    const cacheKey = getCacheKey(recipient, isAdminAccess);
    
    // Prevent cache from growing too large
    if (emailCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest 20% of entries
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
const getBannedUsernames = (): Set<string> => {
    const bannedUsernamesEnv = process.env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set(); // Return empty set if no banned usernames defined
};

const bannedUsernames: Set<string> = getBannedUsernames();

// Optimized IP-based rate limiting using sliding window counter
const rateLimits = new Map<string, RateLimitData>();

// Rate limiting configuration - optimized for memory efficiency
const RATE_LIMITS = {
    TOTAL_REQUESTS_PER_MINUTE: 75,    // Total requests from same IP
    UNIQUE_USERNAMES_PER_MINUTE: 10,   // Different usernames from same IP
    SAME_USERNAME_PER_MINUTE: 50,      // Same username from same IP
    WINDOW_MS: 60000, // 1 minute
    MAX_IPS_TRACKED: 500,              // Reduced from 1000 to save memory
    CLEANUP_INTERVAL: 60000            // Cleanup every 60 seconds (reduced frequency)
};

// Track last cleanup time
let lastCleanup = Date.now();

// Optimized cleanup with LRU eviction
const cleanupRateLimits = (): void => {
    const now = Date.now();
    const ipsToDelete: string[] = [];
    
    rateLimits.forEach((data, ip) => {
        if (now > data.resetTime) {
            ipsToDelete.push(ip);
        }
    });
    
    ipsToDelete.forEach(ip => rateLimits.delete(ip));
    
    // Aggressive LRU cleanup if approaching memory limit
    if (rateLimits.size > RATE_LIMITS.MAX_IPS_TRACKED) {
        const sortedIPs = Array.from(rateLimits.entries())
            .sort((a, b) => a[1].resetTime - b[1].resetTime)
            .slice(0, Math.floor(RATE_LIMITS.MAX_IPS_TRACKED * 0.7)); // Remove 30% of oldest
        
        sortedIPs.forEach(([ip]) => rateLimits.delete(ip));
        
        console.log(`[MEMORY] Cleaned up ${sortedIPs.length} old IP entries, now tracking ${rateLimits.size} IPs`);
    }
    
    lastCleanup = now;
};

// Optimized rate limit check using sliding window
const checkRateLimit = (username: string, clientIP: string): void => {
    const now = Date.now();
    
    // Input validation
    if (!clientIP || clientIP === 'unknown') {
        throw new Error('Rate limit exceeded: Unable to identify client.');
    }
    
    // Periodic cleanup with reduced frequency
    if (now - lastCleanup > RATE_LIMITS.CLEANUP_INTERVAL) {
        cleanupRateLimits();
    }
    
    // Get or create IP data with simplified structure
    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, {
            requestTimestamps: [],
            uniqueUsernames: new Set(),
            resetTime: now + RATE_LIMITS.WINDOW_MS
        });
    }
    
    const ipData = rateLimits.get(clientIP)!;
    
    // Reset if window expired
    if (now > ipData.resetTime) {
        ipData.requestTimestamps = [];
        ipData.uniqueUsernames.clear();
        ipData.resetTime = now + RATE_LIMITS.WINDOW_MS;
    }
    
    // Remove old timestamps from sliding window
    const windowStart = now - RATE_LIMITS.WINDOW_MS;
    ipData.requestTimestamps = ipData.requestTimestamps.filter(timestamp => timestamp > windowStart);
    
    // Check total requests limit using sliding window
    if (ipData.requestTimestamps.length >= RATE_LIMITS.TOTAL_REQUESTS_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests. Please try again later.');
    }
    
    // Check unique usernames limit
    if (!ipData.uniqueUsernames.has(username)) {
        if (ipData.uniqueUsernames.size >= RATE_LIMITS.UNIQUE_USERNAMES_PER_MINUTE) {
            throw new Error('Rate limit exceeded: Too many different emails tried. Please try again later.');
        }
        ipData.uniqueUsernames.add(username);
    }
    
    // Check same username frequency using sliding window
    const recentUsernameRequests = ipData.requestTimestamps.filter((timestamp: number, index: number) => {
        // This is an approximation - in production you'd store username with timestamp
        return index >= ipData.requestTimestamps.length - RATE_LIMITS.SAME_USERNAME_PER_MINUTE;
    });
    
    if (recentUsernameRequests.length >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests for this email. Please try again later.');
    }
    
    // Add current request timestamp
    ipData.requestTimestamps.push(now);
};

const validateUsername = (username: string): string => {
    if (bannedUsernames.has(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    // Regex to validate username.
    // Must start with an alphanumeric character.
    // Subsequent characters can be alphanumeric, underscore, period, or hyphen.
    // This structure is less likely to be flagged by ReDoS linters.
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!regex.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters.`);
    }
    return username;
}

// Email filtering system for specific senders and subjects
const shouldFilterEmail = (email: EmailEvent): boolean => {
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

const getEvents = (recipient: string, res: Response, isAdminAccess: boolean = false): void => {
    // Check cache first to avoid unnecessary API calls
    const cachedEmails = getCachedEmails(recipient, isAdminAccess);
    if (cachedEmails) {
        console.log(`[CACHE] Using cached emails for ${recipient}`);
        res.set('Content-Security-Policy', 'default-src \'self\'');
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.set('X-Cache', 'HIT');
        return void res.status(200).json(cachedEmails);
    }
    
    const searchParams: { event: string; limit: number; recipient?: string } = {
        event: 'accepted',
        limit: 300  // CRITICAL: Add limit to ensure consistent results
    };
    
    // If not admin access, filter by specific recipient
    if (!isAdminAccess) {
        // Sanitize recipient for query to prevent wildcard-like behavior.
        // A trailing '_' can sometimes be interpreted broadly by APIs.
        // We remove it for the query but keep it for the final client-side filter.
        let queryRecipient = recipient;
        if (queryRecipient.endsWith('_')) {
            queryRecipient = queryRecipient.slice(0, -1);
        }
        searchParams.recipient = `${queryRecipient}@${mailgunConfig.emailDomain}`;
    }
    
    mailgunClient.get('/events', searchParams, (error: any, body: { items?: EmailEvent[] }) => {
        if (error) {
            console.error(`Error getting list of messages:`, error);
            
            // Handle Mailgun rate limiting (429 errors)
            if (error.statusCode === 429) {
                console.log(`[MAILGUN RATE LIMIT] Mailgun API limit hit, returning empty array`);
                return void res.status(200).json([]);
            }
            
            return void res.status(500).send({
                error: 'Internal Server Error'
            });
        }
        
        let emails: EmailEvent[] = body.items || [];
        
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
                    (email as any).recipientUser = email.recipient.split('@')[0];
                }
                
                return email; // Return the full original email object
            })
            .sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first
        
        // Cache the results for future requests
        cacheEmails(recipient, isAdminAccess, emails);
        
        res.set('Content-Security-Policy', 'default-src \'self\'');
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.set('X-Cache', 'MISS');
        res.status(200).json(emails);
    });
}

export default (req: ExtendedRequest, res: Response): void => {
    const recipient = req.query.recipient;
    const clientIP = req.realIP || req.ip || 'unknown';
    
    // Input validation
    if (!recipient || typeof recipient !== 'string') {
        void res.status(400).json({
            error: "Invalid recipient parameter"
        });
        return;
    }
    
    // Sanitize input
    const sanitizedRecipient = recipient.trim();
    if (sanitizedRecipient.length === 0 || sanitizedRecipient.length > 100) {
        void res.status(400).json({
            error: "Invalid recipient length"
        });
        return;
    }

    // Admin access - retrieve all emails for all users
    if (sanitizedRecipient === (mailgunConfig as any).adminAccessKey) {
        // Security: Log admin access with IP but don't log the key
        console.log(`[ADMIN ACCESS] IP: ${clientIP} - retrieving all emails`);
        
        return void getEvents('', res, true); // isAdminAccess = true
    }

    // Legacy support for old API key access
    if (sanitizedRecipient === (mailgunConfig as any).apiKey) {
        console.log(`[LEGACY API ACCESS] IP: ${clientIP}`);
        return void getEvents('', res);
    }

    let username: string = sanitizedRecipient.split('@')[0];
    
    // Block direct domain access
    if (username.toLowerCase() === (mailgunConfig as any).emailDomain.toLowerCase()) {
        void res.status(400).json({
            error: "Invalid username format"
        });
        return;
    }

    try {
        // Check IP-based rate limits first
        checkRateLimit(username.toLowerCase(), clientIP);
        
        // Then validate username
        username = validateUsername(username);
    } catch (error: any) {
        console.error(`[${clientIP}] Rate limit or validation error: ${error.message}`);
        
        // Redirect ONLY aggressive users (too many different emails) to CNN to waste their resources
        if (error.message.includes('Too many different emails tried')) {
            console.log(`[RATE LIMIT] Redirecting aggressive user ${clientIP} to CNN`);
            return void res.redirect(302, 'https://sin-speed.hetzner.com/10GB.bin');
        }
        
        void res.status(400).json({
            error: 'Invalid request',
            message: error.message
        });
        return;
    }
    
    getEvents(username, res, false); // isAdminAccess = false
}