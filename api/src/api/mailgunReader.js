// api/src/mailgunReader.js

class MailgunReader {
    constructor(config) {
        this.config = config;
        this.mailgun = require('mailgun-js')({apiKey: config.apiKey, domain: config.emailDomain});
    }

    // Method to list all emails
    listAllEmails() {
        return new Promise((resolve, reject) => {
            this.mailgun.events().list({event: 'accepted'}, function (error, body) {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            });
        });
    }

    // Additional methods as needed
}

module.exports = MailgunReader;
