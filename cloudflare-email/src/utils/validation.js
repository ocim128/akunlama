// validation.js - Username validation utilities

/**
 * Load banned usernames from environment variable
 */
export const getBannedUsernames = (env) => {
    const bannedUsernamesEnv = env.BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set();
};

/**
 * Validate username format and check if banned
 * @returns {{valid: boolean, error: string|null}}
 */
export const validateUsername = (username, env) => {
    if (!username || !username.trim()) {
        return { valid: false, error: 'Username is required.' };
    }

    const bannedUsernames = getBannedUsernames(env);
    if (bannedUsernames.has(username.toLowerCase())) {
        return { valid: false, error: `Invalid username: '${username}' is not allowed.` };
    }

    // Must start with alphanumeric, then can have alphanumeric, underscore, period, or hyphen
    const regex = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;
    if (!regex.test(username)) {
        return { valid: false, error: `Invalid username: '${username}' contains invalid characters.` };
    }

    return { valid: true, error: null };
};

/**
 * Normalize recipient address (add domain if missing, lowercase)
 */
export const normalizeRecipient = (recipient, env) => {
    let normalized = recipient.trim().toLowerCase();

    if (!normalized.includes('@')) {
        if (env.EMAIL_DOMAIN) {
            normalized = `${normalized}@${env.EMAIL_DOMAIN}`;
        } else {
            return { success: false, error: 'EMAIL_DOMAIN is not configured' };
        }
    }

    return { success: true, recipient: normalized };
};

/**
 * Extract username from recipient
 */
export const extractUsername = (recipient) => {
    return recipient.includes('@') ? recipient.split('@')[0] : recipient;
};
