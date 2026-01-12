/**
 * Shared utility functions for email processing
 */

/**
 * Format sender name and email from email header
 * @param {string} sender - Full sender string like "Name <email@example.com>" or just "email@example.com"
 * @returns {Object} { name, emailAddress }
 */
const formatSenderName = (sender) => {
    if (!sender) return { name: 'Unknown', emailAddress: '' };

    // Check for "Name <email@example.com>" format
    const match = sender.match(/^(.*?)\s*<([^>]+)>$/);
    if (match) {
        return {
            name: match[1].trim() || match[2].split('@')[0],
            emailAddress: match[2].trim()
        };
    }

    // If just "email@example.com"
    if (sender.includes('@')) {
        return {
            name: sender.split('@')[0],
            emailAddress: sender.trim()
        };
    }

    return { name: sender, emailAddress: '' };
};

/**
 * Extract email details from email response
 * @param {Object} email - Email object from API
 * @returns {Object} Formatted email details
 */
const extractEmailDetails = (email) => {
    if (!email) return { name: 'Unknown', emailAddress: '', subject: '(No Subject)', recipients: '' };

    const from = email.from || email.sender || '';
    const { name, emailAddress } = formatSenderName(from);

    const details = {
        name: name,
        emailAddress: emailAddress,
        subject: email.subject || email.message?.headers?.subject || '(No Subject)',
        recipients: email.recipients || email.to || email.recipient || email.message?.headers?.to || '',
        Date: email.Date || email.date || email.timestamp || email.received_at || new Date().toISOString()
    };

    return details;
};

module.exports = {
    formatSenderName,
    extractEmailDetails
};
