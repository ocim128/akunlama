// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const reader = new mailgunReader(mailgunConfig);

/**
 * Validate the recipient parameter
 *
 * @param {String} recipient
 */
function validateRecipient(recipient) {
  // Remove leading/trailing whitespace
  recipient = recipient.trim();

  // Ensure recipient contains valid characters and ends with the correct domain
  const recipientRegex = /^[a-zA-Z0-9._-]+@akunlama\.com$/;
  if (!recipientRegex.test(recipient)) {
    throw new Error("Invalid recipient format");
  }

  return recipient;
}

/**
 * Get and return the static email HTML content from the mailgun API, given the mailKey
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function (req, res) {
  let recipient = req.query.recipient;

  try {
    recipient = validateRecipient(recipient);
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }

  reader
    .getKey({ recipient })
    .then((response) => {
      let body = response["body-html"] || response["body-plain"];
      if (body === undefined || body == null) {
        body = "The kittens found no messages :(";
      }
      // Add JS injection to force all links to open as a new tab
      // instead of opening inside the iframe
      body +=
        "<script>" +
        'let linkArray = document.getElementsByTagName("a");' +
        'for (let i=0; i<linkArray.length; ++i) { linkArray[i].target="_blank"; }' +
        // eslint-disable-next-line
        "<\\/script>";
      res.set("cache-control", cacheControl.static);
      res.status(200).send(body);
    })
    .catch((e) => {
      console.error(`Error getting mail HTML for ${recipient}: `, e);
      res.status(500).send({ error: "Internal Server Error" });
    });
};
