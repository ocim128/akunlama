// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const { getEmailNotFoundHtml, getLinkTargetScript, getNoEmailBodyMessage } = require('../shared/errorPages');

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
		let body = response["body-html"] || response["body-plain"];
		if (!body) {
			body = getNoEmailBodyMessage();
		}

		// Add JS injection to force all links to open in new tab
		body += getLinkTargetScript();

		res.set('cache-control', cacheControl.static);
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
