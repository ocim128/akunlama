// email-filter.test.js - Tests for email filtering/blocking service
import {
    loadKeywordsFromEnv,
    shouldBlockEmail
} from '../../src/services/email-filter.ts';
import { expect, test, describe, vi, beforeEach } from 'vitest';

// Mock the config module
vi.mock('../../src/config.ts', () => ({
    DEFAULT_BLOCKED_SENDER_PATTERNS: [
        'registration@facebook',
        'notification@facebookmail.com',
        'posts-recaps@mail.instagram.com',
        'spam@blocked.com'
    ],
    DEFAULT_BLOCKED_SUBJECT_PATTERNS: [
        /been happening on instagram/i,
        /new notifications/i,
        /fb-\d{4,6}.*is your confirmation code/i
    ]
}));

describe('Email Filter Service', () => {
    describe('loadKeywordsFromEnv', () => {
        test('returns empty array for missing env var', () => {
            const env = {};
            const result = loadKeywordsFromEnv(env, 'SOME_KEY');
            expect(result).toEqual([]);
        });

        test('returns empty array for empty string', () => {
            const env = { BLOCKED_KEYWORDS: '' };
            const result = loadKeywordsFromEnv(env, 'BLOCKED_KEYWORDS');
            expect(result).toEqual([]);
        });

        test('returns empty array for whitespace-only string', () => {
            const env = { BLOCKED_KEYWORDS: '   ' };
            const result = loadKeywordsFromEnv(env, 'BLOCKED_KEYWORDS');
            expect(result).toEqual([]);
        });

        test('parses comma-separated keywords', () => {
            const env = { BLOCKED_KEYWORDS: 'spam,virus,phishing' };
            const result = loadKeywordsFromEnv(env, 'BLOCKED_KEYWORDS');
            expect(result).toEqual(['spam', 'virus', 'phishing']);
        });

        test('trims whitespace from keywords', () => {
            const env = { BLOCKED_KEYWORDS: ' spam , virus , phishing ' };
            const result = loadKeywordsFromEnv(env, 'BLOCKED_KEYWORDS');
            expect(result).toEqual(['spam', 'virus', 'phishing']);
        });

        test('converts keywords to lowercase', () => {
            const env = { BLOCKED_KEYWORDS: 'SPAM,Virus,PhIsHiNg' };
            const result = loadKeywordsFromEnv(env, 'BLOCKED_KEYWORDS');
            expect(result).toEqual(['spam', 'virus', 'phishing']);
        });

        test('filters out empty keywords', () => {
            const env = { BLOCKED_KEYWORDS: 'spam,,virus,,,phishing' };
            const result = loadKeywordsFromEnv(env, 'BLOCKED_KEYWORDS');
            expect(result).toEqual(['spam', 'virus', 'phishing']);
        });
    });

    describe('shouldBlockEmail', () => {
        describe('Default Sender Patterns', () => {
            test('blocks Facebook registration emails', () => {
                const result = shouldBlockEmail(
                    'registration@facebookmail.com',
                    'Welcome to Facebook',
                    'Body content',
                    {}
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('sender matches default pattern');
            });

            test('blocks Facebook notification emails', () => {
                const result = shouldBlockEmail(
                    'notification@facebookmail.com',
                    'You have notifications',
                    'Body content',
                    {}
                );
                expect(result.blocked).toBe(true);
            });

            test('blocks case-insensitively', () => {
                const result = shouldBlockEmail(
                    'POSTS-RECAPS@MAIL.INSTAGRAM.COM',
                    'Test',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(true);
            });

            test('allows legitimate emails', () => {
                const result = shouldBlockEmail(
                    'user@legitimate.com',
                    'Normal subject',
                    'Normal body',
                    {}
                );
                expect(result.blocked).toBe(false);
                expect(result.reason).toBe(null);
            });
        });

        describe('Default Subject Patterns', () => {
            test('blocks Instagram recap subjects', () => {
                const result = shouldBlockEmail(
                    'digest@example.com',
                    'See what has been happening on Instagram',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('subject matches default pattern');
            });

            test('blocks notification digest subjects', () => {
                const result = shouldBlockEmail(
                    'notification@facebookmail.com',
                    'New notifications are waiting for you',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(true);
            });

            test('allows Instagram verification code subjects', () => {
                const result = shouldBlockEmail(
                    'security@mail.instagram.com',
                    '123456 is your Instagram code',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(false);
                expect(result.reason).toBe(null);
            });

            test('blocks Facebook confirmation code subjects', () => {
                const result = shouldBlockEmail(
                    'registration@facebookmail.com',
                    'FB-123456 is your confirmation code',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('sender');
            });
        });

        describe('Configurable Sender Keywords', () => {
            test('blocks emails matching sender keywords', () => {
                const env = { BLOCKED_SENDER_KEYWORDS: 'spammer,scam' };
                const result = shouldBlockEmail(
                    'user@spammer-domain.com',
                    'Legit subject',
                    'Normal body',
                    env
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('sender contains blocked keyword');
            });

            test('blocks partial matches in sender', () => {
                const env = { BLOCKED_SENDER_KEYWORDS: 'marketing' };
                const result = shouldBlockEmail(
                    'email-marketing@corp.com',
                    'Subject',
                    'Body',
                    env
                );
                expect(result.blocked).toBe(true);
            });
        });

        describe('Configurable Subject Keywords', () => {
            test('blocks emails matching subject keywords', () => {
                const env = { BLOCKED_SUBJECT_KEYWORDS: 'lottery,winner' };
                const result = shouldBlockEmail(
                    'user@example.com',
                    'You are a lottery winner!',
                    'Normal body',
                    env
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('subject contains blocked keyword');
            });

            test('subject matching is case-insensitive', () => {
                const env = { BLOCKED_SUBJECT_KEYWORDS: 'urgent' };
                const result = shouldBlockEmail(
                    'user@example.com',
                    'URGENT: Action Required',
                    'Body',
                    env
                );
                expect(result.blocked).toBe(true);
            });
        });

        describe('Configurable Body Keywords', () => {
            test('blocks emails matching body keywords', () => {
                const env = { BLOCKED_BODY_KEYWORDS: 'bitcoin,cryptocurrency' };
                const result = shouldBlockEmail(
                    'user@example.com',
                    'Investment opportunity',
                    'Invest in bitcoin today!',
                    env
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('body contains blocked keyword');
            });

            test('body matching is case-insensitive', () => {
                const env = { BLOCKED_BODY_KEYWORDS: 'phishing' };
                const result = shouldBlockEmail(
                    'user@example.com',
                    'Subject',
                    'This is a PHISHING attempt',
                    env
                );
                expect(result.blocked).toBe(true);
            });
        });

        describe('Edge Cases', () => {
            test('handles null sender', () => {
                const result = shouldBlockEmail(
                    null,
                    'Subject',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(false);
            });

            test('handles null subject', () => {
                const result = shouldBlockEmail(
                    'user@example.com',
                    null,
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(false);
            });

            test('handles null body', () => {
                const result = shouldBlockEmail(
                    'user@example.com',
                    'Subject',
                    null,
                    {}
                );
                expect(result.blocked).toBe(false);
            });

            test('handles all null values', () => {
                const result = shouldBlockEmail(null, null, null, {});
                expect(result.blocked).toBe(false);
            });

            test('handles empty strings', () => {
                const result = shouldBlockEmail('', '', '', {});
                expect(result.blocked).toBe(false);
            });

            test('priority: sender patterns checked before subject', () => {
                // Both sender and subject would match, but sender should be returned
                const result = shouldBlockEmail(
                    'notification@facebookmail.com',
                    'New notifications on Instagram',
                    'Body',
                    {}
                );
                expect(result.blocked).toBe(true);
                expect(result.reason).toContain('sender');
            });
        });
    });
});
