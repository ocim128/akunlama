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
