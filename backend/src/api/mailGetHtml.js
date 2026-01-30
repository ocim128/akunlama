// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const { getEmailNotFoundHtml, getLinkTargetScript, getNoEmailBodyMessage } = require('../shared/errorPages');
const { decodeQuotedPrintable } = require('../shared/utils');
const { sanitizeEmailHTML, detectDangerousPatterns } = require('../shared/sanitizer');

const reader = new mailgunReader(mailgunConfig);

/**
 * Get and return the email HTML content from the mailgun API
 *
 * @param {Object} req Express request
 * @param {Object} res Express response
 */
module.exports = function (req, res) {
	const region = req.query.region;
	const key = req.query.key;

	if (!region || region === "") {
		return res.status(400).send('{ "error" : "No `region` param found" }');
	}

	if (!key || key === "") {
		return res.status(400).send('{ "error" : "No `key` param found" }');
	}

	reader.getKey({ region, key }).then(response => {
		let body = response["body-html"] || response["body-plain"] || '';
		let isHtml = !!response["body-html"];

		if (!body) {
			body = getNoEmailBodyMessage();
			isHtml = true;
		} else {
			// Decode quoted-printable if present
			if (body.includes('=3D') || body.includes('=\r\n') || body.includes('=\n')) {
				body = decodeQuotedPrintable(body);
			}

			// Better HTML detection
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

			// If it's plain text, wrap it in basic HTML
			if (!isHtml) {
				const escapedBody = body
					.replace(/&/g, "&amp;")
					.replace(/</g, "&lt;")
					.replace(/>/g, "&gt;")
					.replace(/"/g, "&quot;")
					.replace(/'/g, "&#039;");

				body = `<!DOCTYPE html><html><head><style>body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #374151; padding: 2rem; white-space: pre-wrap; word-break: break-word; background-color: #ffffff; }</style></head><body>${escapedBody}</body></html>`;
			}
		}

		// Sanitize HTML content to prevent XSS attacks
		const dangerCheck = detectDangerousPatterns(body);
		if (dangerCheck.isDangerous) {
			console.log(`[SECURITY] Dangerous patterns detected in email ${region}/${key}: ${dangerCheck.patterns.join(', ')}`);
		}
		body = sanitizeEmailHTML(body);

		// Add JS injection to force all links to open in new tab
		body += getLinkTargetScript();

		res.set('Content-Type', 'text/html; charset=utf-8');
		res.set('cache-control', cacheControl.static);
		res.set('X-Content-Type-Options', 'nosniff');
		res.set('X-XSS-Protection', '1; mode=block');
		res.status(200).send(body);
	})
		.catch(e => {
			// Check if this is a 404/400 error (expired/missing email)
			const is404 = (e.response && (e.response.status === 404 || e.response.status === 400)) ||
				(e.message && (e.message.includes('404') || e.message.includes('400'))) ||
				(e.toString && (e.toString().includes('404') || e.toString().includes('400')));

			if (is404) {
				console.log(`[404] Email expired: ${region}/${key}`);
				res.set('Content-Type', 'text/html');
				res.set('cache-control', cacheControl.static);
				return res.status(404).send(getEmailNotFoundHtml());
			} else {
				console.error(`[ERROR] Mail HTML error ${region}/${key}: ${e.message}`);
				return res.status(500).send("{error: 'Unable to load email'}");
			}
		});
};
