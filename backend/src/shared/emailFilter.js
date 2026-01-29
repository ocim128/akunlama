/**
 * Email validation module
 * Handles username validation and banned username checking
 * 
 * NOTE: Email content filtering (sender/subject/body keywords) is now handled
 * at the Cloudflare Worker level (cloudflare-email/email-worker.js) to prevent
 * unwanted emails from being stored in the first place. This saves D1 storage quota.
 * 
 * This module only handles:
 * - Username validation (format checking)
 * - Banned usernames (from BANNED_USERNAMES env var)
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

// Log banned usernames on startup
if (bannedUsernames.size > 0) {
    console.log(`[EMAIL FILTER] Loaded ${bannedUsernames.size} banned usernames`);
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

module.exports = {
    validateUsername,
    bannedUsernames
};
