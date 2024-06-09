// Cache control settings
const cacheControl = require("./config/cacheControl");

// app package loading
let app = require("./src/app-setup");

// Middleware to validate and sanitize the recipient parameter
const validateRecipient = (req, res, next) => {
  let recipient = req.query.recipient;

  if (recipient) {
    // Remove any leading/trailing whitespace
    recipient = recipient.trim();

    // Ensure recipient contains at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(recipient)) {
      return res.status(400).send({ error: 'Invalid recipient' });
    }

    // Remove any characters that are not alphanumeric, dot, underscore, or hyphen
    recipient = recipient.replace(/[^a-zA-Z0-9._-]/g, '');

    // Ensure the recipient ends with the correct domain
    const domain = 'akunlama.com';
    if (recipient.endsWith(`@${domain}`)) {
      recipient = recipient.substring(0, recipient.indexOf('@'));
    } else if (recipient.includes('@')) {
      return res.status(400).send({ error: 'Invalid recipient domain' });
    }

    // Update the sanitized recipient in the request query
    req.query.recipient = recipient + '@' + domain;
  }

  next();
};

// Setup the routes with validation middleware
app.get("/api/v1/mail/list", validateRecipient, require("./src/api/mailList"));
app.get("/api/v1/mail/getInfo", validateRecipient, require("./src/api/mailGetInfo"));
app.get("/api/v1/mail/getHtml", validateRecipient, require("./src/api/mailGetHtml"));

// Legacy fallback behaviour - 
// Note this is to be deprecated (after updating UI)
app.get("/api/v1/mail/getKey", validateRecipient, require("./src/api/mailGetInfo"));

// Static regex 
const staticRegex = /static\/(js|css|img)\/(.+)\.([a-zA-Z0-9]+)\.(css|js|png|gif)/g;

// Static folder hosting with cache control
// See express static options: https://expressjs.com/en/4x/api.html#express.static
app.use(app.express.static("public", {
	etag: true,
	setHeaders: function (res, path, stat) {
		if (staticRegex.test(path)) {
			res.set('cache-control', cacheControl.immutable);
		} else {
			res.set('cache-control', cacheControl.static);
		}
	}
}));

// Custom 404 handling - use index.html
app.use(function (req, res) {
	res.set('cache-control', cacheControl.static);
	res.sendFile(__dirname + '/public/index.html');
});

// Setup the server
var server = app.listen(8000, function () {
	console.log("app running on port.", server.address().port);
});
