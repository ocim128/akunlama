/**
 * Shared utility functions for email processing
 */

/**
 * Format sender name from email header
 * @param {string} sender - Full sender string like "Name <email@example.com>"
 * @returns {Array} [name, rest] where rest is the email part
 */
const formatSenderName = (sender) => {
    if (!sender) return ['', []];
    const [name, ...rest] = sender.split(' <');
    return [name, rest];
};

/**
 * Extract email details from email response
 * @param {Object} email - Email object from API
 * @returns {Object} Formatted email details
 */
const extractEmailDetails = (email) => {
    const from = email.from || email.sender || '';
    const [name, rest] = formatSenderName(from);

    const details = {
        name: name
    };

    if (rest[0] && rest[0].length > 0) {
        details.emailAddress = ' <' + rest;
    }

    details.subject = email.subject || '';
    details.recipients = email.recipients || email.to || email.recipient || '';

    return details;
};

module.exports = {
    formatSenderName,
    extractEmailDetails
};
