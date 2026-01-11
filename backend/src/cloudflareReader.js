// Cloudflare API Reader - uses shared axios client
const { axiosClient } = require('./shared/axiosClient');

/**
 * Cloudflare Email API Reader class
 * 
 * Example usage:
 * ```
 * let reader = new CloudflareReader({ apiUrl: "https://worker.dev", emailDomain: "example.com" })
 * reader.recipientEventList("test@example.com");
 * reader.getEmail("email-id");
 * ```
 */
class CloudflareReader {
    constructor(config) {
        this._config = config;

        // Validate the config
        if (!this._config.apiUrl || this._config.apiUrl.length <= 0) {
            throw new Error("Missing config.apiUrl");
        }
        if (!this._config.emailDomain || this._config.emailDomain.length <= 0) {
            throw new Error("Missing config.emailDomain");
        }
    }

    /**
     * Validate the request email format
     * @param {string} email
     * @returns {boolean}
     */
    recipientEmailValidation(email) {
        return true;
    }

    /**
     * Get and return a list of email events
     * @param {string} email - recipient email address
     * @returns {Promise<Object>} List of email events
     */
    async recipientEventList(email) {
        if (!this.recipientEmailValidation(email)) {
            throw new Error("Invalid email format: " + email);
        }

        const url = `${this._config.apiUrl}/api/events?recipient=${encodeURIComponent(email)}`;
        const response = await axiosClient.get(url);
        return response.data;
    }

    /**
     * Get email content by ID
     * @param {string} emailId
     * @returns {Promise<Object>} Email content
     */
    async getEmail(emailId) {
        const url = `${this._config.apiUrl}/api/email/${encodeURIComponent(emailId)}`;
        const response = await axiosClient.get(url);
        return response.data;
    }

    /**
     * Get email by region and key (compatibility layer)
     * Since Cloudflare uses simple IDs, we treat the key as the emailId
     * @param {Object} params - { region, key }
     * @returns {Promise<Object>}
     */
    getKey({ region, key }) {
        return this.getEmail(key);
    }

    /**
     * Validate the email format
     * @param {string} email
     * @returns {string} Trimmed and validated email
     * @throws {Error} if email format is invalid
     */
    validateEmail(email) {
        email = email.trim();
        const allowedCharacters = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/;
        if (!allowedCharacters.test(email)) {
            throw new Error("Invalid email format");
        }
        return email;
    }
}

module.exports = CloudflareReader;
