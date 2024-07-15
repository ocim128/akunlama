const mailgun = require('mailgun-js');
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});
const ADMIN_ACCESS_KEY = mailgunConfig.apiKey;

function validateUsername(username) {
    const bannedUsernames = [
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
    ];
    if (bannedUsernames.includes(username.toLowerCase())) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    return username;
}

module.exports = function(req, res) {
    let recipient = req.query.recipient;
    if (!recipient) {
        return res.status(400).send({
            error: "No `recipient` param found"
        });
    }

    if (recipient === ADMIN_ACCESS_KEY) {
        mailgunClient.get('/events', {
            event: 'accepted'
        }, (error, body) => {
            if (error) {
                console.error(`Error getting list of messages:`, error);
                return res.status(500).send({
                    error: error.message
                });
            }
            res.set('cache-control', cacheControl.dynamic);
            res.status(200).send(body.items);
        });
        return;
    }

    if (recipient.toLowerCase().endsWith(`@${mailgunConfig.emailDomain.toLowerCase()}`)) {
        recipient = recipient.split('@')[0];
    }

    if (recipient.toLowerCase() === "akunlama.com") {
        return res.status(400).send({
            error: "Direct use of 'akunlama.com' is not allowed"
        });
    }

    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9._-]{0,62}[a-zA-Z0-9])?$/.test(recipient)) {
        return res.status(400).send({
            error: "Invalid recipient format"
        });
    }

    try {
        recipient = validateUsername(recipient);
    } catch (error) {
        return res.status(400).send({
            error: error.message
        });
    }

    mailgunClient.get('/events', {
        recipient: `${recipient}@${mailgunConfig.emailDomain}`,
        event: 'accepted'
    }, (error, body) => {
        if (error) {
            console.error(`Error getting list of messages for "${recipient}":`, error);
            return res.status(500).send({
                error: error.message
            });
        }
        res.set('cache-control', cacheControl.dynamic);
        res.status(200).send(body.items);
    });
};
