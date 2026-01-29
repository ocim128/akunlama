/**
 * Shared email filtering and validation module
 * Used by both Mailgun and Cloudflare API handlers
 * 
 * Supports configurable keyword filtering via environment variables:
 * - BLOCKED_SENDER_KEYWORDS: comma-separated keywords to block in sender address
 * - BLOCKED_SUBJECT_KEYWORDS: comma-separated keywords to block in subject
 * - BLOCKED_BODY_KEYWORDS: comma-separated keywords to block in email body
 * 
 * This helps reduce server load and save Cloudflare/Vercel quota by filtering
 * unwanted emails before they reach the client.
 */

// Load banned usernames from environment variable
const getBannedUsernames = () => {
    const bannedUsernamesEnv = process.env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set();
};

/**
 * Load comma-separated keywords from environment variable
 * @param {string} envVar - Environment variable name
 * @returns {string[]} Array of lowercase keywords
 */
const loadKeywordsFromEnv = (envVar) => {
    const value = process.env[envVar] || '';
    if (!value.trim()) return [];
    return value.split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 0);
};

const bannedUsernames = getBannedUsernames();

// Load configurable blocked keywords from environment
const blockedSenderKeywords = loadKeywordsFromEnv('BLOCKED_SENDER_KEYWORDS');
const blockedSubjectKeywords = loadKeywordsFromEnv('BLOCKED_SUBJECT_KEYWORDS');
const blockedBodyKeywords = loadKeywordsFromEnv('BLOCKED_BODY_KEYWORDS');

// Log filter configuration on startup
if (blockedSenderKeywords.length > 0) {
    console.log(`[EMAIL FILTER] Loaded ${blockedSenderKeywords.length} blocked sender keywords`);
}
if (blockedSubjectKeywords.length > 0) {
    console.log(`[EMAIL FILTER] Loaded ${blockedSubjectKeywords.length} blocked subject keywords`);
}
if (blockedBodyKeywords.length > 0) {
    console.log(`[EMAIL FILTER] Loaded ${blockedBodyKeywords.length} blocked body keywords`);
}

/**
 * Validate username format and check if banned
 * @param {string} username 
 * @returns {string} validated username
 * @throws {Error} if username is invalid or banned
 */
const validateUsername = (username) => {
    if (bannedUsernames.has(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    // Must start with alphanumeric, then can have alphanumeric, underscore, period, or hyphen
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!regex.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters.`);
    }
    return username;
};

// Default blocked sender patterns (Meta/Facebook related) - always active
const blockedSenderPatterns = [
    'registration@facebook',
    'registrations@mail.instagram.com',
    'registration@facebookmail.com',
    'groupupdates@facebookmail.com',
    'reminders@facebookmail.com',
    'friendsuggestion@facebookmail.com',
    'pageupdates@facebookmail.com'
];

// Default blocked subject patterns (verification codes) - always active
const blockedSubjectPatterns = [
    /\d{6}.*adalah kode instagram anda/i,
    /\d{6}.*is your threads code/i,
    /\d{6}.*is your instagram code/i,
    /\d{4,6}.*is your confirmation code/i,
    /fb-\d{4,6}.*is your confirmation code/i
];

/**
 * Check if text contains any of the blocked keywords
 * @param {string} text - Text to check
 * @param {string[]} keywords - Array of keywords to check for
 * @returns {string|null} The matched keyword or null if no match
 */
const containsBlockedKeyword = (text, keywords) => {
    if (!text || keywords.length === 0) return null;
    const lowerText = text.toLowerCase();
    for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
            return keyword;
        }
    }
    return null;
};

/**
 * Check if an email should be filtered out
 * Filters based on:
 * 1. Default hardcoded patterns (Meta/Facebook related)
 * 2. Configurable sender keywords (BLOCKED_SENDER_KEYWORDS)
 * 3. Configurable subject keywords (BLOCKED_SUBJECT_KEYWORDS)
 * 4. Configurable body keywords (BLOCKED_BODY_KEYWORDS)
 * 
 * @param {Object} email - Email object
 * @param {boolean} logReason - Whether to log the filter reason (default: false)
 * @returns {boolean} true if email should be filtered
 */
const shouldFilterEmail = (email, logReason = false) => {
    const fromAddress = (email.sender || email.from || email.message?.headers?.from || '').toLowerCase();
    const subject = (email.subject || email.message?.headers?.subject || '');
    const body = (email.body || email.message?.body || email['body-plain'] || email['body-html'] || '');

    // Check if sender matches default blocked patterns
    for (const pattern of blockedSenderPatterns) {
        if (fromAddress.includes(pattern.toLowerCase())) {
            if (logReason) console.log(`[EMAIL FILTER] Blocked by default sender pattern: ${pattern}`);
            return true;
        }
    }

    // Check if subject matches default blocked regex patterns
    for (const pattern of blockedSubjectPatterns) {
        if (pattern.test(subject)) {
            if (logReason) console.log(`[EMAIL FILTER] Blocked by default subject pattern: ${pattern}`);
            return true;
        }
    }

    // Check configurable sender keywords
    const senderKeywordMatch = containsBlockedKeyword(fromAddress, blockedSenderKeywords);
    if (senderKeywordMatch) {
        if (logReason) console.log(`[EMAIL FILTER] Blocked by sender keyword: "${senderKeywordMatch}"`);
        return true;
    }

    // Check configurable subject keywords
    const subjectKeywordMatch = containsBlockedKeyword(subject, blockedSubjectKeywords);
    if (subjectKeywordMatch) {
        if (logReason) console.log(`[EMAIL FILTER] Blocked by subject keyword: "${subjectKeywordMatch}"`);
        return true;
    }

    // Check configurable body keywords
    const bodyKeywordMatch = containsBlockedKeyword(body, blockedBodyKeywords);
    if (bodyKeywordMatch) {
        if (logReason) console.log(`[EMAIL FILTER] Blocked by body keyword: "${bodyKeywordMatch}"`);
        return true;
    }

    return false;
};

/**
 * Get current filter statistics
 * @returns {Object} Filter configuration info
 */
const getFilterStats = () => ({
    defaultSenderPatterns: blockedSenderPatterns.length,
    defaultSubjectPatterns: blockedSubjectPatterns.length,
    configuredSenderKeywords: blockedSenderKeywords.length,
    configuredSubjectKeywords: blockedSubjectKeywords.length,
    configuredBodyKeywords: blockedBodyKeywords.length,
    totalFilters: blockedSenderPatterns.length + blockedSubjectPatterns.length +
        blockedSenderKeywords.length + blockedSubjectKeywords.length + blockedBodyKeywords.length
});

module.exports = {
    validateUsername,
    shouldFilterEmail,
    containsBlockedKeyword,
    getFilterStats,
    blockedSenderPatterns,
    blockedSubjectPatterns,
    blockedSenderKeywords,
    blockedSubjectKeywords,
    blockedBodyKeywords
};
