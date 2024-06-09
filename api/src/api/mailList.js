// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl  = require("../../config/cacheControl");
const reader = new mailgunReader(mailgunConfig);

// Function to validate and sanitize the recipient username
function validateAndSanitizeRecipient(recipient) {
  // Remove leading/trailing whitespace
  recipient = recipient.trim();

  // Remove any characters that are not alphanumeric, underscore, or hyphen
  recipient = recipient.replace(/[^a-zA-Z0-9_-]/g, '');

  // Check if the recipient is empty after sanitization
  if (recipient === '') {
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
module.exports = function(req, res) {
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

  // Strip off all @domain if there is any
  if (recipient.indexOf("@") >= 0) {
    recipient = recipient.substring(0, recipient.indexOf("@"));
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
