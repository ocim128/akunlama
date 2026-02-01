// email-filter.ts - Email filtering/blocking service

import { DEFAULT_BLOCKED_SENDER_PATTERNS, DEFAULT_BLOCKED_SUBJECT_PATTERNS } from '../config.ts';

/** Email filter result */
export interface FilterResult {
    blocked: boolean;
    reason: string | null;
}

/** Environment with optional blocking keywords */
interface FilterEnv {
    BLOCKED_SENDER_KEYWORDS?: string;
    BLOCKED_SUBJECT_KEYWORDS?: string;
    BLOCKED_BODY_KEYWORDS?: string;
    [key: string]: unknown;
}

/**
 * Load comma-separated keywords from environment variable
 */
export const loadKeywordsFromEnv = (env: FilterEnv, key: string): string[] => {
    const value = (env[key] as string) || '';
    if (!value.trim()) return [];
    return value.split(',')
        .map(keyword => keyword.trim().toLowerCase())
        .filter(keyword => keyword.length > 0);
};

/**
 * Check if an email should be filtered (blocked) before storage
 */
export const shouldBlockEmail = (
    sender: string | null,
    subject: string | null,
    body: string | null,
    env: FilterEnv
): FilterResult => {
    const senderLower = (sender || '').toLowerCase();
    const subjectLower = (subject || '').toLowerCase();
    const bodyLower = (body || '').toLowerCase();

    // Check default blocked sender patterns
    for (const pattern of DEFAULT_BLOCKED_SENDER_PATTERNS) {
        if (senderLower.includes(pattern.toLowerCase())) {
            return { blocked: true, reason: `sender matches default pattern: ${pattern}` };
        }
    }

    // Check default blocked subject patterns (regex)
    for (const pattern of DEFAULT_BLOCKED_SUBJECT_PATTERNS) {
        if (pattern.test(subject || '')) {
            return { blocked: true, reason: `subject matches default pattern` };
        }
    }

    // Check configurable sender keywords (BLOCKED_SENDER_KEYWORDS env var)
    const blockedSenderKeywords = loadKeywordsFromEnv(env, 'BLOCKED_SENDER_KEYWORDS');
    for (const keyword of blockedSenderKeywords) {
        if (senderLower.includes(keyword)) {
            return { blocked: true, reason: `sender contains blocked keyword: ${keyword}` };
        }
    }

    // Check configurable subject keywords (BLOCKED_SUBJECT_KEYWORDS env var)
    const blockedSubjectKeywords = loadKeywordsFromEnv(env, 'BLOCKED_SUBJECT_KEYWORDS');
    for (const keyword of blockedSubjectKeywords) {
        if (subjectLower.includes(keyword)) {
            return { blocked: true, reason: `subject contains blocked keyword: ${keyword}` };
        }
    }

    // Check configurable body keywords (BLOCKED_BODY_KEYWORDS env var)
    const blockedBodyKeywords = loadKeywordsFromEnv(env, 'BLOCKED_BODY_KEYWORDS');
    for (const keyword of blockedBodyKeywords) {
        if (bodyLower.includes(keyword)) {
            return { blocked: true, reason: `body contains blocked keyword: ${keyword}` };
        }
    }

    return { blocked: false, reason: null };
};
