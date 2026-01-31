// rate-limiter.test.js
import { checkRateLimit } from '../../src/services/rate-limiter.js';
import { expect, test, describe, beforeEach } from 'vitest';

describe('Rate Limiter', () => {
    const mockIP = '127.0.0.1';

    // We need to access the internal state or mock Date.now() for robust testing
    // Since checkRateLimit uses module-level state, we rely on the fact that
    // different tests run in isolation or we might need a reset function.

    test('allows first request', () => {
        const result = checkRateLimit('user1', mockIP);
        expect(result.allowed).toBe(true);
    });

    // Note: More comprehensive tests would require refactoring rate-limiter 
    // to accept a state object or class instance to be testable without side effects.
});
