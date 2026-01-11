// Cloudflare API Reader - replaces mailgunReader.js
// Connects to your Cloudflare Email Worker API

const axios = require("axios");

// Create a reusable axios instance with connection pooling
const axiosInstance = axios.create({
    timeout: 10000,
    maxRedirects: 5,
    httpAgent: new require('http').Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 50,
        maxFreeSockets: 10
    }),
    httpsAgent: new require('https').Agent({
        keepAlive: true,
        keepAliveMsecs: 30000,
        maxSockets: 50,
        maxFreeSockets: 10
    })
});

/**
 * Cloudflare Email API Reader class
 * 
 * Example usage:
 * ```
 * let reader = new cloudflareReader({ apiUrl: "https://worker.dev", emailDomain: "example.com" })
 * reader.recipientEventList("test@example.com");
 * reader.getEmail("email-id");
 * ```
 */
let cloudflareReader = function cloudflareReader(config) {
    this._config = config;

    // Validate the config
    if (!this._config.apiUrl || this._config.apiUrl.length <= 0) {
        throw new Error("Missing config.apiUrl");
    }
    if (!this._config.emailDomain || this._config.emailDomain.length <= 0) {
        throw new Error("Missing config.emailDomain");
    }
};

/**
 * Validate the request email against list of domains
 *
 * @param {String} email
 */
cloudflareReader.prototype.recipientEmailValidation = function recipientEmailValidation(email) {
    return true;
};

/**
 * Get and return a list of email events
 *
 * @param {String} email - recipient email address
 * @return Promise object, returning list of email events
 */
cloudflareReader.prototype.recipientEventList = function recipientEventList(email) {
    if (!this.recipientEmailValidation(email)) {
        return Promise.reject("Invalid email format: " + email);
    }

    const url = `${this._config.apiUrl}/api/events?recipient=${encodeURIComponent(email)}`;

    return axiosInstance.get(url).then(response => response.data);
};

/**
 * Get email content by ID (replaces getUrl/getKey for Mailgun)
 *
 * @param {String} emailId
 * @return Promise object, returning email content
 */
cloudflareReader.prototype.getEmail = function getEmail(emailId) {
    const url = `${this._config.apiUrl}/api/email/${encodeURIComponent(emailId)}`;

    return axiosInstance.get(url).then(response => response.data);
};

/**
 * Get email by region and key (compatibility layer for existing code)
 * Since Cloudflare uses simple IDs, we treat the key as the emailId
 *
 * @param {Object} params - { region, key }
 * @return Promise object, returning email content
 */
cloudflareReader.prototype.getKey = function getKey({ region, key }) {
    // In Cloudflare, we don't use region - just the key/id
    return this.getEmail(key);
};

/**
 * Validate the email format
 *
 * @param {String} email
 */
cloudflareReader.prototype.validateEmail = function validateEmail(email) {
    email = email.trim();
    const allowedCharacters = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]{2,}$/;
    if (!allowedCharacters.test(email)) {
        throw new Error("Invalid email format");
    }
    return email;
};

module.exports = cloudflareReader;
