// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const { extractEmailDetails } = require('../shared/emailUtils');

const reader = new mailgunReader(mailgunConfig);

/**
 * Get and return the static email header details from the mailgun API given the mailKey
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
		const emailDetails = extractEmailDetails(response);

		res.set('cache-control', cacheControl.static);
		res.status(200).send(emailDetails);
	})
		.catch(e => {
			console.error(`Error getting mail metadata info for /${region}/${key}: `, e);
			res.status(500).send("{error: '" + e + "'}");
		});
};
