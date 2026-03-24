// config.ts - Configuration constants for the worker

/** Rate limiting configuration interface */
export interface RateLimitConfig {
    TOTAL_REQUESTS_PER_MINUTE: number;
    UNIQUE_USERNAMES_PER_MINUTE: number;
    SAME_USERNAME_PER_MINUTE: number;
    WINDOW_MS: number;
    MAX_IPS_TRACKED: number;
    CLEANUP_INTERVAL: number;
}

// Email retention period: 3 days in milliseconds
export const EMAIL_RETENTION_MS: number = 3 * 24 * 60 * 60 * 1000;

// Rate limiting configuration
export const RATE_LIMITS: RateLimitConfig = {
    TOTAL_REQUESTS_PER_MINUTE: 75,
    UNIQUE_USERNAMES_PER_MINUTE: 10,
    SAME_USERNAME_PER_MINUTE: 50,
    WINDOW_MS: 60000, // 1 minute
    MAX_IPS_TRACKED: 500,
    CLEANUP_INTERVAL: 60000 // Cleanup every 60 seconds
};

// Default blocked sender patterns for unwanted Meta/Facebook notifications.
// Instagram registration/login emails should remain deliverable.
export const DEFAULT_BLOCKED_SENDER_PATTERNS: string[] = [
    'registration@facebook',
    'registration@facebookmail.com',
    'notification@facebookmail.com',
    'friendsuggestion@facebookmail.com',
    'friendupdates@facebookmail.com',
    'friends@facebookmail.com',
    'close_friend_updates@facebookmail.com',
    'groupupdates@facebookmail.com',
    'pageupdates@facebookmail.com',
    'reminders@facebookmail.com',
    'posts-recaps@mail.instagram.com'
];

// Default blocked subject patterns for noisy social digests and Facebook codes.
export const DEFAULT_BLOCKED_SUBJECT_PATTERNS: RegExp[] = [
    /been happening on instagram/i,
    /catch up on moments/i,
    /more in your feed/i,
    /started following you/i,
    /new notifications/i,
    /\d{6}.*is your threads code/i,
    /\d{4,6}.*is your facebook confirmation code/i,
    /fb-\d{4,6}.*is your confirmation code/i
];
