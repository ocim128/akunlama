/**
 * Shared rate limiting module
 * Used by both Mailgun and Cloudflare API handlers
 */

// IP-based rate limiting using sliding window counter
const rateLimits = new Map();

// Rate limiting configuration
const RATE_LIMITS = {
    TOTAL_REQUESTS_PER_MINUTE: 75,
    UNIQUE_USERNAMES_PER_MINUTE: 10,
    SAME_USERNAME_PER_MINUTE: 50,
    WINDOW_MS: 60000, // 1 minute
    MAX_IPS_TRACKED: 500,
    CLEANUP_INTERVAL: 60000 // Cleanup every 60 seconds
};

// Track last cleanup time
let lastCleanup = Date.now();

/**
 * Cleanup expired rate limit entries
 */
const cleanupRateLimits = () => {
    const now = Date.now();
    const ipsToDelete = [];

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
            .slice(0, Math.floor(RATE_LIMITS.MAX_IPS_TRACKED * 0.7));

        sortedIPs.forEach(([ip]) => rateLimits.delete(ip));

        console.log(`[MEMORY] Cleaned up ${sortedIPs.length} old IP entries, now tracking ${rateLimits.size} IPs`);
    }

    lastCleanup = now;
};

/**
 * Check rate limit for a username from a client IP
 * @param {string} username 
 * @param {string} clientIP 
 * @throws {Error} if rate limit exceeded
 */
const checkRateLimit = (username, clientIP) => {
    const now = Date.now();

    // Input validation
    if (!clientIP || clientIP === 'unknown') {
        throw new Error('Rate limit exceeded: Unable to identify client.');
    }

    // Periodic cleanup with reduced frequency
    if (now - lastCleanup > RATE_LIMITS.CLEANUP_INTERVAL) {
        cleanupRateLimits();
    }

    // Get or create IP data
    if (!rateLimits.has(clientIP)) {
        rateLimits.set(clientIP, {
            requestTimestamps: [],
            uniqueUsernames: new Set(),
            resetTime: now + RATE_LIMITS.WINDOW_MS
        });
    }

    const ipData = rateLimits.get(clientIP);

    // Reset if window expired
    if (now > ipData.resetTime) {
        ipData.requestTimestamps = [];
        ipData.uniqueUsernames.clear();
        ipData.resetTime = now + RATE_LIMITS.WINDOW_MS;
    }

    // Remove old timestamps from sliding window
    const windowStart = now - RATE_LIMITS.WINDOW_MS;
    ipData.requestTimestamps = ipData.requestTimestamps.filter(timestamp => timestamp > windowStart);

    // Check total requests limit
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

    // Check same username frequency
    const recentUsernameRequests = ipData.requestTimestamps.filter((_, index) => {
        return index >= ipData.requestTimestamps.length - RATE_LIMITS.SAME_USERNAME_PER_MINUTE;
    });

    if (recentUsernameRequests.length >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
        throw new Error('Rate limit exceeded: Too many requests for this email. Please try again later.');
    }

    // Add current request timestamp
    ipData.requestTimestamps.push(now);
};

/**
 * Clear all rate limits (useful for testing)
 */
const clearRateLimits = () => {
    rateLimits.clear();
    lastCleanup = Date.now();
};

module.exports = {
    checkRateLimit,
    clearRateLimits,
    RATE_LIMITS
};
