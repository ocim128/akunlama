// Cloudflare version of mailGetInfo.js
// Fetches email metadata from Cloudflare Worker API
const axios = require('axios');
const cloudflareConfig = require("../../config/cloudflareConfig");
const cacheControl = require("../../config/cacheControl");

/**
 * Get and return the email header details from Cloudflare API
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
        // Fetch email from Cloudflare API
        const apiUrl = `${cloudflareConfig.apiUrl}/api/email/${encodeURIComponent(key)}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        const email = response.data;
        let emailDetails = {};

        // Format and extract the name of the user
        const from = email.from || email.sender || '';
        let [name, ...rest] = formatName(from);
        emailDetails.name = name;

        // Extract the rest of the email domain after splitting
        if (rest[0] && rest[0].length > 0) {
            emailDetails.emailAddress = ' <' + rest;
        }

        // Extract the subject
        emailDetails.subject = email.subject || '';

        // Extract the recipients
        emailDetails.recipients = email.to || email.recipient || '';

        res.set('cache-control', cacheControl.static);
        res.status(200).send(emailDetails);

    } catch (error) {
        console.error(`Error getting mail metadata info for /${region}/${key}: `, error.message);
        res.status(500).send("{error: '" + error.message + "'}");
    }
}

function formatName(sender) {
    let [name, ...rest] = sender.split(' <');
    return [name, rest];
}
