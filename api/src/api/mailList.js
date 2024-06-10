// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const reader = new mailgunReader(mailgunConfig);

// Function to validate and sanitize the recipient username
function validateAndSanitizeRecipient(recipient) {
  // Remove leading/trailing whitespace
  recipient = recipient.trim();

  // Check if the recipient matches the expected format and domain
  const isValidRecipient = /^[a-zA-Z0-9._-]+$/.test(recipient);

  if (!isValidRecipient) {
    throw new Error("Invalid recipient username");
  }

  return recipient;
}

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

  try {
    // Validate and sanitize the recipient username
    recipient = validateAndSanitizeRecipient(recipient);
  } catch (error) {
    res.status(400).send({ error: error.message });
    return;
  }

  reader.recipientEventList(recipient + "@" + mailgunConfig.emailDomain)
    .then(response => {
      res.set('cache-control', cacheControl.dynamic);
      res.status(200).send(response.items);
    })
    .catch(e => {
      console.error(`Error getting list of messages for "${recipient}":`, e);
      res.status(500).send({ error: 'Internal Server Error' });
    });
};
