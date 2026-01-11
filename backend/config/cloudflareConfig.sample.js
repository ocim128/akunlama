//
// Cloudflare Email Worker API configuration
// Replaces Mailgun for email receiving
//
module.exports = {
    "apiUrl": "${CLOUDFLARE_API_URL}",
    "emailDomain": "${EMAIL_DOMAIN}",
    "adminAccessKey": "${ADMIN_ACCESS_KEY}",
    //"corsOrigin"    : "*"
}
