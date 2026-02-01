// validation.ts - Username validation utilities

import type { Env } from '../types/index.d.ts';

/** Result of username validation */
export interface ValidationResult {
    valid: boolean;
    error: string | null;
}

/** Result of recipient normalization */
export interface NormalizeResult {
    success: boolean;
    recipient?: string;
    error?: string;
}

/**
 * Load banned usernames from environment variable
 */
export const getBannedUsernames = (env: Env): Set<string> => {
    const bannedUsernamesEnv = (env as { BANNED_USERNAMES?: string }).BANNED_USERNAMES || '';
    if (bannedUsernamesEnv) {
        return new Set(bannedUsernamesEnv.split(',').map(name => name.trim().toLowerCase()));
    }
    return new Set();
};

/**
 * Validate username format and check if banned
 */
export const validateUsername = (username: string, env: Env): ValidationResult => {
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
export const normalizeRecipient = (recipient: string, env: Env): NormalizeResult => {
    let normalized = recipient.trim().toLowerCase();

    if (!normalized.includes('@')) {
        const emailDomain = (env as { EMAIL_DOMAIN?: string }).EMAIL_DOMAIN;
        if (emailDomain) {
            normalized = `${normalized}@${emailDomain}`;
        } else {
            return { success: false, error: 'EMAIL_DOMAIN is not configured' };
        }
    }

    return { success: true, recipient: normalized };
};

/**
 * Extract username from recipient
 */
export const extractUsername = (recipient: string): string => {
    return recipient.includes('@') ? recipient.split('@')[0] : recipient;
};
