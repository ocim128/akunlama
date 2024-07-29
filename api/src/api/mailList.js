const mailgun = require('mailgun-js');
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});

const bannedUsernames = new Set([
    "faturrasyidmuhammad07",
    "diandikaara",
    "hawkman7609",
    "yogiceper25",
    "green14fly",
    "najman8522",
    "faradina6986",
    "wyizrjo2g86kclm",
    "research-population-76",
    "endangpurwanti0511",
    "melanyp_andini",
    "obeidtukhisongs",
    "aspakpahtan21"
]);

const validateUsername = (username) => {
    if (bannedUsernames.has(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters.`);
    }
    return username;
}

const getEvents = (recipient, res) => {
    const recipientRegex = new RegExp(`^${recipient}$`, 'i');
    mailgunClient.get('/events', {
        recipient: `${recipientRegex.source}@${mailgunConfig.emailDomain}`,
        event: 'accepted'
    }, (error, body) => {
        if (error) {
            console.error(`Error getting list of messages:`, error);
            return res.status(500).send({
                error: 'Internal Server Error'
            });
        }
        res.set('cache-control', cacheControl.dynamic);
        res.set('Content-Security-Policy', 'default-src \'self\'');
        res.set('X-Frame-Options', 'SAMEORIGIN');
        res.set('X-XSS-Protection', '1; mode=block');
        res.status(200).send(body.items);
    });
}

module.exports = (req, res) => {
    const recipient = req.query.recipient;
    if (!recipient) {
        return res.status(400).send({
            error: "No `recipient` param found"
        });
    }

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
}
