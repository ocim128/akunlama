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

  if (recipient == null) {
    res.status(400).send({ error: "No `recipient` param found" });
    return;
  }

  // Validate recipient format
  const recipientRegex = /^[a-zA-Z0-9._-]+@akunlama\.com$/;
  if (!recipientRegex.test(recipient)) {
    res.status(400).send({ error: "Invalid recipient format" });
    return;
  }

  // Strip off domain to get the recipient's username
  const recipientUsername = recipient.split('@')[0];

  // Ensure recipient is already validated and sanitized
  reader.recipientEventList(recipient)
    .then(response => {
      res.set('cache-control', cacheControl.dynamic);
      res.status(200).send(response.items);
    })
    .catch(e => {
      console.error(`Error getting list of messages for "${recipient}":`, e);
      res.status(500).send({ error: 'Internal Server Error' });
    });
};
