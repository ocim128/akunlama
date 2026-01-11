/**
 * Shared email caching module
 * Used by both Mailgun and Cloudflare API handlers
 */

const emailCache = new Map();
const CACHE_TTL = 5000; // 5 seconds cache
const MAX_CACHE_SIZE = 1000; // Prevent memory exhaustion

/**
 * Generate cache key for email lookup
 * @param {string} recipient 
 * @param {boolean} isAdminAccess 
 * @returns {string}
 */
const getCacheKey = (recipient, isAdminAccess) => {
    return `${isAdminAccess ? 'admin' : 'user'}:${recipient}`;
};

/**
 * Get cached emails for a recipient
 * @param {string} recipient 
 * @param {boolean} isAdminAccess 
 * @returns {Array|null}
 */
const getCachedEmails = (recipient, isAdminAccess) => {
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

/**
 * Cache emails for a recipient
 * @param {string} recipient 
 * @param {boolean} isAdminAccess 
 * @param {Array} emails 
 */
const cacheEmails = (recipient, isAdminAccess, emails) => {
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

/**
 * Clear all cached emails (useful for testing)
 */
const clearCache = () => {
    emailCache.clear();
};

module.exports = {
    getCachedEmails,
    cacheEmails,
    clearCache,
    CACHE_TTL,
    MAX_CACHE_SIZE
};
