// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl  = require("../../config/cacheControl");
const reader = new mailgunReader(mailgunConfig);

// Function to validate and sanitize the region and key parameters
function validateAndSanitizeParams(region, key) {
  // Remove leading/trailing whitespace
  region = region.trim();
  key = key.trim();

  // Remove any characters that are not alphanumeric, underscore, or hyphen
  region = region.replace(/[^a-zA-Z0-9_-]/g, '');
  key = key.replace(/[^a-zA-Z0-9_-]/g, '');

  // Check if the region or key is empty after sanitization
  if (region === '' || key === '') {
    throw new Error("Invalid region or key");
  }

  return { region, key };
}

/**
 * Get and return the static email header details from the mailgun API given the mailKey
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function(req, res){
  let region = req.query.region;
  let key = req.query.key;

  try {
    // Validate and sanitize the region and key parameters
    const validatedParams = validateAndSanitizeParams(region, key);
    region = validatedParams.region;
    key = validatedParams.key;
  } catch (error) {
    return res.status(400).send({ error: error.message });
  }

  reader.getKey({ region, key }).then(response => {
    let emailDetails = {};
    // Format and extract the name of the user
    let [name, ...rest] = formatName(response.from);
    emailDetails.name = name;
    // Extract the rest of the email domain after splitting
    if (rest[0].length > 0) {
      emailDetails.emailAddress = ' <' + rest;
    }
    // Extract the subject of the response
    emailDetails.subject = response.subject;
    // Extract the recipients
    emailDetails.recipients = response.recipients;
    // Return with cache control
    res.set('cache-control', cacheControl.static);
    res.status(200).send(emailDetails);
  })
  .catch(e => {
    console.error(`Error getting mail metadata info for /${region}/${key}: `, e);
    res.status(500).send({ error: 'Internal Server Error' });
  });
};

function formatName(sender) {
  let [name, ...rest] = sender.split(' <');
  return [name, rest];
}
