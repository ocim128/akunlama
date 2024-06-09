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
    return res.status(400).send({ error: "No `recipient` param found" });
  }

  // Validate recipient format
  const recipientRegex = /^[a-zA-Z0-9._-]+@akunlama\.com$/;
  if (!recipientRegex.test(recipient)) {
    return res.status(400).send({ error: "Invalid recipient format" });
  }

  // Ensure the recipient has valid characters and proper domain
  recipient = recipient.replace(/[^a-zA-Z0-9._-@]/g, '');
  
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
