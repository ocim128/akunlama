// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const reader = new mailgunReader(mailgunConfig);

/**
 * Validate the region and key parameters and ensure they contain only allowed characters
 *
 * @param {String} region
 * @param {String} key
 */
function validateParams(region, key) {
    console.log("Validating parameters: region=", region, ", key=", key);
    if (!region || !key) {
        throw new Error("Region or key is undefined or null");
    }
    // Remove leading/trailing whitespace
    region = region.trim();
    key = key.trim();
    // Validate that only allowed characters are present
    if (!/^[a-zA-Z0-9._-]+$/.test(region) || !/^[a-zA-Z0-9._-]+$/.test(key)) {
        throw new Error("Invalid region or key");
    }
    return { region, key };
}

/**
 * Get and return the static email HTML content from the mailgun API, given the mailKey
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function (req, res) {
    let region = req.query.region;
    let key = req.query.key;
    console.log("Received request with region:", region, "and key:", key);

    try {
        // Validate and sanitize the region and key parameters
        const validatedParams = validateParams(region, key);
        region = validatedParams.region;
        key = validatedParams.key;
    } catch (error) {
        console.error("Validation error:", error.message);
        return res.status(400).send({ error: error.message });
    }

    reader
        .getKey({ region, key })
        .then((response) => {
            let emailContent = response["body-html"] || response["body-plain"];
            if (!emailContent) {
                emailContent = "The kittens found no messages :(";
            }

            // Encode the email content to safely include it in the wrapper HTML
            const encodedEmailContent = Buffer.from(emailContent).toString('base64');

            // Create a wrapper HTML that loads the email content in an iframe
            const wrapperHTML = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Email Content</title>
                    <style>
                        body, html { margin: 0; padding: 0; height: 100%; }
                        iframe { width: 100%; height: 100%; border: none; }
                    </style>
                </head>
                <body>
                    <iframe id="emailContentFrame" sandbox="allow-scripts allow-popups"></iframe>
                    <script>
                        (function() {
                            const iframe = document.getElementById('emailContentFrame');
                            const encodedContent = "${encodedEmailContent}";
                            const decodedContent = atob(encodedContent);
                            
                            iframe.srcdoc = decodedContent;

                            iframe.onload = function() {
                                iframe.contentWindow.document.body.addEventListener('click', function(e) {
                                    if (e.target.tagName === 'A') {
                                        e.preventDefault();
                                        window.open(e.target.href, '_blank');
                                    }
                                }, true);
                            };
                        })();
                    </script>
                </body>
                </html>
            `;

            res.set("cache-control", cacheControl.static);
            res.status(200).send(wrapperHTML);
        })
        .catch((e) => {
            console.error(`Error getting mail HTML for /${region}/${key}: `, e);
            res.status(500).send({ error: "Internal Server Error" });
        });
};
