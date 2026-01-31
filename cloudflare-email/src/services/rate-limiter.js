// rate-limiter.js - In-memory rate limiting service
// Note: In Workers, each isolate has its own memory, so this is
// approximate rate limiting. For strict limiting, use Durable Objects.

import { RATE_LIMITS } from '../config.js';

const rateLimits = new Map();
let lastCleanup = Date.now();

/**
 * Cleanup expired rate limit entries
 */
export const cleanupRateLimits = () => {
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
 * @returns {{allowed: boolean, error: string|null}}
 */
export const checkRateLimit = (username, clientIP) => {
    const now = Date.now();

    if (!clientIP || clientIP === 'unknown') {
        return { allowed: false, error: 'Rate limit exceeded: Unable to identify client.' };
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
        return { allowed: false, error: 'Rate limit exceeded: Too many requests. Please try again later.' };
    }

    // Check unique usernames limit
    if (!ipData.uniqueUsernames.has(username)) {
        if (ipData.uniqueUsernames.size >= RATE_LIMITS.UNIQUE_USERNAMES_PER_MINUTE) {
            return { allowed: false, error: 'Rate limit exceeded: Too many different emails tried. Please try again later.' };
        }
        ipData.uniqueUsernames.add(username);
    }

    // Check same username frequency
    const recentUsernameRequests = ipData.requestTimestamps.filter((_, index) => {
        return index >= ipData.requestTimestamps.length - RATE_LIMITS.SAME_USERNAME_PER_MINUTE;
    });

    if (recentUsernameRequests.length >= RATE_LIMITS.SAME_USERNAME_PER_MINUTE) {
        return { allowed: false, error: 'Rate limit exceeded: Too many requests for this email. Please try again later.' };
    }

    // Add current request timestamp
    ipData.requestTimestamps.push(now);

    return { allowed: true, error: null };
};
