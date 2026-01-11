// Cloudflare version of mailGetHtml.js
const { axiosClient } = require('../shared/axiosClient');
const cloudflareConfig = require("../../config/cloudflareConfig");
const cacheControl = require("../../config/cacheControl");
const { getEmailNotFoundHtml, getLinkTargetScript, getNoEmailBodyMessage } = require('../shared/errorPages');

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
			response.data.body_html || response.data.body_text;

		if (!body) {
			body = getNoEmailBodyMessage();
		}

		// Add JS injection to force all links to open in new tab
		body += getLinkTargetScript();

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
