// Shared axios client with connection pooling
const { axiosClient, get: axiosGet } = require('./shared/axiosClient');

/**
 * Simple MailgunApi accessor class for reading event stream, and saved emails
 *
 * Example usage:
 * ```
 * let reader = new mailgunReader({ apiKey:"api-*****", emailDomain:"inboxkitten.com" })
 * reader.recipientEventList("some-domain.inboxkitten.com");
 * reader.getKey({region, key});
 * ```
 */
class MailgunReader {
	constructor(config) {
		this._config = config;

		// Validate the config
		if (!this._config.apiKey || this._config.apiKey.length <= 0) {
			throw new Error("Missing config.apiKey");
		}
		if (!this._config.emailDomain || this._config.emailDomain.length <= 0) {
			throw new Error("Missing config.emailDomain");
		}

		// Default mailgun domain if not set
		this._config.mailgunApi = this._config.mailgunApi || "https://api.mailgun.net/v3";

		// Setup the authentication option object
		this._authOption = {
			auth: {
				username: "api",
				password: this._config.apiKey
			}
		};
	}

	/**
	 * Validate the request email format
	 * @param {string} email
	 * @returns {boolean}
	 */
	recipientEmailValidation(email) {
		// Basic validation - can be extended
		return true;
	}

	/**
	 * Get and return a list of email events
	 * @param {string} email
	 * @returns {Promise<Object>} List of email events
	 */
	recipientEventList(email) {
		if (!this.recipientEmailValidation(email)) {
			return Promise.reject("Invalid email format: " + email);
		}

		const url = `${this._config.mailgunApi}/${this._config.emailDomain}/events?recipient=${email}`;
		return axiosGet(url, this._authOption);
	}

	/**
	 * Validate URL for mailgun API access
	 * @param {string} url
	 * @returns {boolean}
	 */
	getUrlValidation(url) {
		return true;
	}

	/**
	 * Get content of a mailgun URL
	 * @param {string} url
	 * @returns {Promise<Object>}
	 */
	getUrl(url) {
		if (!this.getUrlValidation(url)) {
			return Promise.reject("Invalid getUrl request: " + url);
		}
		return axiosGet(url, this._authOption);
	}

	/**
	 * Get email content by region and storage key
	 * @param {Object} params - { region, key }
	 * @returns {Promise<Object>}
	 */
	getKey({ region, key }) {
		let apiUrl = this._config.mailgunApi;
		apiUrl = apiUrl.replace("://", `://storage-${region}.`);
		const url = `${apiUrl}/domains/${this._config.emailDomain}/messages/${key}`;
		return axiosGet(url, this._authOption);
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

module.exports = MailgunReader;
