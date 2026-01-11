/**
 * Shared email filtering and validation module
 * Used by both Mailgun and Cloudflare API handlers
 */

// Load banned usernames from environment variable
const getBannedUsernames = () => {
    const bannedUsernamesEnv = process.env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set();
};

const bannedUsernames = getBannedUsernames();

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

// Blocked sender patterns (Meta/Facebook related)
const blockedSenderPatterns = [
    'registration@facebook',
    'registrations@mail.instagram.com',
    'registration@facebookmail.com',
    'groupupdates@facebookmail.com',
    'reminders@facebookmail.com',
    'friendsuggestion@facebookmail.com',
    'pageupdates@facebookmail.com'
];

// Blocked subject patterns (verification codes)
const blockedSubjectPatterns = [
    /\d{6}.*adalah kode instagram anda/i,
    /\d{6}.*is your threads code/i,
    /\d{6}.*is your instagram code/i,
    /\d{4,6}.*is your confirmation code/i,
    /fb-\d{4,6}.*is your confirmation code/i
];

/**
 * Check if an email should be filtered out
 * @param {Object} email 
 * @returns {boolean} true if email should be filtered
 */
const shouldFilterEmail = (email) => {
    const fromAddress = (email.sender || email.from || email.message?.headers?.from || '').toLowerCase();
    const subject = (email.subject || email.message?.headers?.subject || '').toLowerCase();

    // Check if sender matches blocked patterns
    for (const pattern of blockedSenderPatterns) {
        if (fromAddress.includes(pattern.toLowerCase())) {
            return true;
        }
    }

    // Check if subject matches blocked patterns
    for (const pattern of blockedSubjectPatterns) {
        if (pattern.test(subject)) {
            return true;
        }
    }

    return false;
};

module.exports = {
    validateUsername,
    shouldFilterEmail,
    blockedSenderPatterns,
    blockedSubjectPatterns
};
