const mailgun = require('mailgun-js');
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});

// In-memory store for rate limiting: IP -> { email -> timestamp }
const rateLimitStore = {};

const bannedUsernames = new Set([
    "faturrasyidmuhammad07",
    "diani38071",
    "pazaleegre",
    "cemiloktay2",
    "theboybil",
    "diandikaara",
    "hawkman7609",
    "autenticview",
    "yogiceper25",
    "green14fly",
    "najman8522",
    "faradina6986",
    "wyizrjo2g86kclm",
    "research-population-76",
    "endangpurwanti0511",
    "melanyp_andini",
    "obeidtukhisongs",
    "pedoblicke",
    "aspakpahtan21",
    "ardiclops"
]);

const validateUsername = (username) => {
    if (bannedUsernames.has(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    if (!/^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*$/.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters.`);
    }
    return username;
};

const getEvents = (recipient, res) => {
    mailgunClient.get('/events', {
        recipient: `${recipient}@${mailgunConfig.emailDomain}`,
        event: 'accepted'
    }, (error, body) => {
        if (error) {
            console.error(`Error getting list of messages:`, error);
            return res.status(500).send({
                error: 'Internal Server Error'
            });
        }
        const emails = body.items.filter(email => {
            const recipientUsername = email.recipient.split('@')[0].toLowerCase();
            return recipientUsername === recipient.toLowerCase();
        });
        res.set('cache-control', cacheControl.dynamic);
        res.set('Content-Security-Policy', 'default-src \'self\'');
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.status(200).send(emails);
    });
};

module.exports = (req, res) => {
    const recipient = req.query.recipient;
    if (!recipient) {
        return res.status(400).send({
            error: "No `recipient` param found"
        });
    }

    // Rate limiting logic
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute in milliseconds

    // Initialize store for this IP if not exists
    if (!rateLimitStore[ip]) {
        rateLimitStore[ip] = {};
    }

    // Clean up entries older than 1 minute
    for (const email in rateLimitStore[ip]) {
        if (rateLimitStore[ip][email] < now - windowMs) {
            delete rateLimitStore[ip][email];
        }
    }

    // Normalize the recipient (local part) to lowercase
    const email = recipient.toLowerCase();

    // Check if this email is already in the store
    if (!rateLimitStore[ip][email]) {
        // New unique email: check limit
        if (Object.keys(rateLimitStore[ip]).length >= 10) {
            return res.status(429).send({
                error: 'Rate limit exceeded: Max 10 unique email addresses per minute'
            });
        }
        // Add new email with current timestamp
        rateLimitStore[ip][email] = now;
    }
    // If email is already in store, proceed without incrementing count

    // Existing logic continues
    if (recipient === mailgunConfig.apiKey) {
        return getEvents('', res);
    }

    let username = recipient.split('@')[0];
    if (username.toLowerCase() === "akunlama.com") {
        return res.status(400).send({
            error: "Direct use of 'akunlama.com' is not allowed"
        });
    }

    try {
        username = validateUsername(username);
    } catch (error) {
        console.error(`Error validating username:`, error);
        return res.status(400).send({
            error: 'Invalid username'
        });
    }

    getEvents(username, res);
};
