// Cloudflare version of mailGetInfo.js
const { axiosClient } = require('../shared/axiosClient');
const cloudflareConfig = require("../../config/cloudflareConfig");
const cacheControl = require("../../config/cacheControl");
const { extractEmailDetails } = require('../shared/emailUtils');

/**
 * Get and return the email header details from Cloudflare API
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

        const emailDetails = extractEmailDetails(response.data);

        res.set('cache-control', cacheControl.static);
        res.status(200).send(emailDetails);

    } catch (error) {
        console.error(`Error getting mail metadata info for /${region}/${key}: `, error.message);
        res.status(500).send("{error: '" + error.message + "'}");
    }
};
