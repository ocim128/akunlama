// validation.test.js - Tests for username validation utilities
import {
    getBannedUsernames,
    validateUsername,
    normalizeRecipient,
    extractUsername
} from '../../src/utils/validation.ts';
import { expect, test, describe } from 'vitest';

describe('Validation Utils', () => {
    describe('getBannedUsernames', () => {
        test('returns empty Set when no env var', () => {
            const env = {};
            const result = getBannedUsernames(env);
            expect(result).toBeInstanceOf(Set);
            expect(result.size).toBe(0);
        });

        test('returns empty Set for empty string', () => {
            const env = { BANNED_USERNAMES: '' };
            const result = getBannedUsernames(env);
            expect(result.size).toBe(0);
        });

        test('parses comma-separated list', () => {
            const env = { BANNED_USERNAMES: 'admin,root,system' };
            const result = getBannedUsernames(env);
            expect(result.size).toBe(3);
            expect(result.has('admin')).toBe(true);
            expect(result.has('root')).toBe(true);
            expect(result.has('system')).toBe(true);
        });

        test('trims whitespace from usernames', () => {
            const env = { BANNED_USERNAMES: ' admin , root , system ' };
            const result = getBannedUsernames(env);
            expect(result.has('admin')).toBe(true);
            expect(result.has('root')).toBe(true);
        });

        test('converts usernames to lowercase', () => {
            const env = { BANNED_USERNAMES: 'Admin,ROOT,SyStEm' };
            const result = getBannedUsernames(env);
            expect(result.has('admin')).toBe(true);
            expect(result.has('root')).toBe(true);
            expect(result.has('system')).toBe(true);
        });
    });

    describe('validateUsername', () => {
        const mockEnv = { BANNED_USERNAMES: 'admin,root,system' };

        test('accepts valid alphanumeric username', () => {
            const result = validateUsername('testuser', mockEnv);
            expect(result.valid).toBe(true);
            expect(result.error).toBe(null);
        });

        test('accepts username with underscore', () => {
            const result = validateUsername('test_user', mockEnv);
            expect(result.valid).toBe(true);
        });

        test('accepts username with period', () => {
            const result = validateUsername('test.user', mockEnv);
            expect(result.valid).toBe(true);
        });

        test('accepts username with hyphen', () => {
            const result = validateUsername('test-user', mockEnv);
            expect(result.valid).toBe(true);
        });

        test('accepts username starting with number', () => {
            const result = validateUsername('123test', mockEnv);
            expect(result.valid).toBe(true);
        });

        test('rejects empty username', () => {
            const result = validateUsername('', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('required');
        });

        test('rejects null username', () => {
            const result = validateUsername(null, mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('required');
        });

        test('rejects whitespace-only username', () => {
            const result = validateUsername('   ', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('required');
        });

        test('rejects banned username', () => {
            const result = validateUsername('admin', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not allowed');
        });

        test('rejects banned username case-insensitively', () => {
            const result = validateUsername('ADMIN', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('not allowed');
        });

        test('rejects username starting with underscore', () => {
            const result = validateUsername('_user', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('invalid characters');
        });

        test('rejects username starting with period', () => {
            const result = validateUsername('.user', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('invalid characters');
        });

        test('rejects username starting with hyphen', () => {
            const result = validateUsername('-user', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('invalid characters');
        });

        test('rejects username with special characters', () => {
            const result = validateUsername('user@name', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('invalid characters');
        });

        test('rejects username with spaces', () => {
            const result = validateUsername('user name', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('invalid characters');
        });

        test('rejects username with unicode characters', () => {
            const result = validateUsername('用户名', mockEnv);
            expect(result.valid).toBe(false);
            expect(result.error).toContain('invalid characters');
        });

        test('works with empty banned list', () => {
            const result = validateUsername('admin', {});
            expect(result.valid).toBe(true);
        });
    });

    describe('normalizeRecipient', () => {
        const mockEnv = { EMAIL_DOMAIN: 'example.com' };

        test('adds domain to username without @', () => {
            const result = normalizeRecipient('testuser', mockEnv);
            expect(result.success).toBe(true);
            expect(result.recipient).toBe('testuser@example.com');
        });

        test('preserves full email address', () => {
            const result = normalizeRecipient('user@other.com', mockEnv);
            expect(result.success).toBe(true);
            expect(result.recipient).toBe('user@other.com');
        });

        test('converts to lowercase', () => {
            const result = normalizeRecipient('TestUser@Example.COM', mockEnv);
            expect(result.success).toBe(true);
            expect(result.recipient).toBe('testuser@example.com');
        });

        test('trims whitespace', () => {
            const result = normalizeRecipient('  testuser  ', mockEnv);
            expect(result.success).toBe(true);
            expect(result.recipient).toBe('testuser@example.com');
        });

        test('fails when EMAIL_DOMAIN not configured', () => {
            const result = normalizeRecipient('testuser', {});
            expect(result.success).toBe(false);
            expect(result.error).toContain('EMAIL_DOMAIN');
        });

        test('handles empty EMAIL_DOMAIN', () => {
            const result = normalizeRecipient('testuser', { EMAIL_DOMAIN: '' });
            expect(result.success).toBe(false);
            expect(result.error).toContain('EMAIL_DOMAIN');
        });
    });

    describe('extractUsername', () => {
        test('extracts username from email address', () => {
            expect(extractUsername('user@example.com')).toBe('user');
        });

        test('returns original string if no @ symbol', () => {
            expect(extractUsername('justusername')).toBe('justusername');
        });

        test('handles multiple @ symbols (takes first part)', () => {
            expect(extractUsername('user@weird@domain.com')).toBe('user');
        });

        test('handles empty username before @', () => {
            expect(extractUsername('@domain.com')).toBe('');
        });

        test('handles complex local parts', () => {
            expect(extractUsername('user.name+tag@example.com')).toBe('user.name+tag');
        });
    });
});
