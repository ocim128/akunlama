// config.js - Configuration constants for the worker

// Email retention period: 3 days in milliseconds
export const EMAIL_RETENTION_MS = 3 * 24 * 60 * 60 * 1000;

// Rate limiting configuration
export const RATE_LIMITS = {
    TOTAL_REQUESTS_PER_MINUTE: 75,
    UNIQUE_USERNAMES_PER_MINUTE: 10,
    SAME_USERNAME_PER_MINUTE: 50,
    WINDOW_MS: 60000, // 1 minute
    MAX_IPS_TRACKED: 500,
    CLEANUP_INTERVAL: 60000 // Cleanup every 60 seconds
};

// Default blocked sender patterns (Meta/Facebook related)
export const DEFAULT_BLOCKED_SENDER_PATTERNS = [
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

// Default blocked subject patterns (verification codes)
export const DEFAULT_BLOCKED_SUBJECT_PATTERNS = [
    /\d{6}.*adalah kode instagram anda/i,
    /\d{6}.*is your threads code/i,
    /\d{6}.*is your instagram code/i,
    /\d{4,6}.*is your confirmation code/i,
    /fb-\d{4,6}.*is your confirmation code/i
];
