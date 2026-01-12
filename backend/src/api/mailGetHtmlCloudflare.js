// Cloudflare version of mailGetHtml.js
const { axiosClient } = require('../shared/axiosClient');
const cloudflareConfig = require("../../config/cloudflareConfig");
const cacheControl = require("../../config/cacheControl");
const { getEmailNotFoundHtml, getLinkTargetScript, getNoEmailBodyMessage } = require('../shared/errorPages');
const { decodeQuotedPrintable } = require('../shared/utils');

/**
 * Get and return the email HTML content from Cloudflare API
 *
 * @param {Object} req Express request
 * @param {Object} res Express response
 */
module.exports = async function (req, res) {
	const region = req.query.region;
	const key = req.query.key;

	if (!region || region === "") {
		return res.status(400).send('{ "error" : "No `region` param found" }');
	}

	if (!key || key === "") {
		return res.status(400).send('{ "error" : "No `key` param found" }');
	}

	try {
		const apiUrl = `${cloudflareConfig.apiUrl}/api/email/${encodeURIComponent(key)}`;
		const response = await axiosClient.get(apiUrl, { timeout: 10000 });

		let body = response.data["body-html"] || response.data["body-plain"] ||
			response.data.body_html || response.data.body_text || '';

		let isHtml = !!(response.data["body-html"] || response.data.body_html);

		if (!body) {
			body = getNoEmailBodyMessage();
			isHtml = true; // Error message is HTML
		} else {
			// Decode quoted-printable if present
			if (body.includes('=3D') || body.includes('=\r\n') || body.includes('=\n')) {
				body = decodeQuotedPrintable(body);
			}

			// Better HTML detection: if it looks like HTML, treat it as HTML
			const trimmedBody = body.trim().toLowerCase();
			if (!isHtml && (
				trimmedBody.startsWith('<!doctype') ||
				trimmedBody.startsWith('<html') ||
				trimmedBody.startsWith('<div') ||
				(trimmedBody.includes('<body') && trimmedBody.includes('</body')) ||
				(trimmedBody.includes('<table') && trimmedBody.includes('</table'))
			)) {
				isHtml = true;
			}

			// If it's plain text, wrap it in basic HTML for better rendering in the iframe
			if (!isHtml) {
				// Escape HTML entities to prevent XSS if plain text contains HTML-like strings
				const escapedBody = body
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#039;");

				body = `<!DOCTYPE html><html><head><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; padding: 2rem; white-space: pre-wrap; word-break: break-word; background-color: #ffffff; }</style></head><body>${escapedBody}</body></html>`;
			}
		}

		// Add JS injection to force all links to open in new tab
		body += getLinkTargetScript();

		res.set('Content-Type', 'text/html; charset=utf-8');
		res.set('cache-control', cacheControl.static);
		res.status(200).send(body);

	} catch (error) {
		const is404 = error.response?.status === 404 || error.response?.status === 400;

		if (is404) {
			console.log(`[404] Email not found: ${region}/${key}`);
			res.set('Content-Type', 'text/html');
			res.set('cache-control', cacheControl.static);
			return res.status(404).send(getEmailNotFoundHtml());
		} else {
			console.error(`[ERROR] Mail HTML error ${region}/${key}: ${error.message}`);
			return res.status(500).send("{error: 'Unable to load email'}");
		}
	}
};
