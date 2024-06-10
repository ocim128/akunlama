// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");

const reader = new mailgunReader(mailgunConfig);

/**
 * Mail listing api, returns the list of emails
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function (req, res) {
    let params = req.query;
    let recipient = params.recipient;

    if (!recipient) {
        return res.status(400).send({ error: "No `recipient` param found" });
    }

    // Validate recipient - it should not be a single character like '-' or '_'
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]*[a-zA-Z0-9])?$/.test(recipient)) {
        return res.status(400).send({ error: "Invalid recipient format" });
    }

    reader.recipientEventList(`${recipient}@${mailgunConfig.emailDomain}`)
        .then(response => {
            res.set('cache-control', cacheControl.dynamic);
            res.status(200).send(response.items);
        })
        .catch(e => {
            console.error(`Error getting list of messages for "${recipient}":`, e);
            res.status(500).send({ error: e.message });
        });
};
