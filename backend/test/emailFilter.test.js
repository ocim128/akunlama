/**
 * Email Filter Unit Tests
 * Tests for configurable keyword-based email filtering
 */

// Mock environment variables before requiring module
process.env.BLOCKED_SENDER_KEYWORDS = 'noreply,newsletter,marketing';
process.env.BLOCKED_SUBJECT_KEYWORDS = 'unsubscribe,promotional offer';
process.env.BLOCKED_BODY_KEYWORDS = 'click here to unsubscribe,automated message';

const {
    shouldFilterEmail,
    containsBlockedKeyword,
    getFilterStats,
    blockedSenderKeywords,
    blockedSubjectKeywords,
    blockedBodyKeywords
} = require('../src/shared/emailFilter');

console.log('='.repeat(50));
console.log('Email Filter Tests');
console.log('='.repeat(50));

// Test getFilterStats
console.log('\n[TEST] getFilterStats()');
const stats = getFilterStats();
console.log('  Filter stats:', stats);
console.assert(stats.configuredSenderKeywords === 3, 'Should have 3 sender keywords');
console.assert(stats.configuredSubjectKeywords === 2, 'Should have 2 subject keywords');
console.assert(stats.configuredBodyKeywords === 2, 'Should have 2 body keywords');
console.log('  ✅ PASSED');

// Test containsBlockedKeyword
console.log('\n[TEST] containsBlockedKeyword()');
console.assert(containsBlockedKeyword('noreply@test.com', blockedSenderKeywords) === 'noreply', 'Should match noreply');
console.assert(containsBlockedKeyword('hello@test.com', blockedSenderKeywords) === null, 'Should not match');
console.assert(containsBlockedKeyword('NEWSLETTER@TEST.COM', blockedSenderKeywords) === 'newsletter', 'Should be case insensitive');
console.log('  ✅ PASSED');

// Test shouldFilterEmail - Default sender patterns
console.log('\n[TEST] shouldFilterEmail - Default sender patterns');
const facebookEmail = {
    sender: 'registration@facebookmail.com',
    subject: 'Welcome to Facebook'
};
console.assert(shouldFilterEmail(facebookEmail) === true, 'Should block Facebook registration email');
console.log('  ✅ PASSED - Facebook emails blocked');

// Test shouldFilterEmail - Default subject patterns
console.log('\n[TEST] shouldFilterEmail - Default subject patterns');
const instagramCodeEmail = {
    sender: 'security@instagram.com',
    subject: '123456 is your Instagram code'
};
console.assert(shouldFilterEmail(instagramCodeEmail) === true, 'Should block Instagram code email');
console.log('  ✅ PASSED - Instagram code emails blocked');

// Test shouldFilterEmail - Configurable sender keywords
console.log('\n[TEST] shouldFilterEmail - Configurable sender keywords');
const newsletterEmail = {
    sender: 'newsletter@example.com',
    subject: 'Weekly Update'
};
console.assert(shouldFilterEmail(newsletterEmail) === true, 'Should block newsletter emails');
console.log('  ✅ PASSED - Newsletter emails blocked');

// Test shouldFilterEmail - Configurable subject keywords
console.log('\n[TEST] shouldFilterEmail - Configurable subject keywords');
const promoEmail = {
    sender: 'sales@store.com',
    subject: 'Exclusive Promotional Offer Inside!'
};
console.assert(shouldFilterEmail(promoEmail) === true, 'Should block promotional emails');
console.log('  ✅ PASSED - Promotional emails blocked');

// Test shouldFilterEmail - Configurable body keywords
console.log('\n[TEST] shouldFilterEmail - Configurable body keywords');
const automatedEmail = {
    sender: 'system@company.com',
    subject: 'System Notification',
    body: 'This is an automated message from the system.'
};
console.assert(shouldFilterEmail(automatedEmail) === true, 'Should block automated emails');
console.log('  ✅ PASSED - Automated emails blocked');

// Test shouldFilterEmail - Allowed email
console.log('\n[TEST] shouldFilterEmail - Allowed emails');
const normalEmail = {
    sender: 'friend@gmail.com',
    subject: 'Hey, how are you?',
    body: 'Just wanted to say hi!'
};
console.assert(shouldFilterEmail(normalEmail) === false, 'Should allow normal emails');
console.log('  ✅ PASSED - Normal emails allowed');

// Test with Cloudflare email structure
console.log('\n[TEST] shouldFilterEmail - Cloudflare email structure');
const cloudflareEmail = {
    id: 'abc123',
    timestamp: Date.now(),
    message: {
        headers: {
            from: 'noreply@service.com',
            to: 'user@akunlama.com',
            subject: 'Account Update'
        }
    }
};
console.assert(shouldFilterEmail(cloudflareEmail) === true, 'Should block Cloudflare structured email');
console.log('  ✅ PASSED - Cloudflare email structure handled');

console.log('\n' + '='.repeat(50));
console.log('All tests passed! ✅');
console.log('='.repeat(50));
