//
// Cloudflare Email Worker API configuration
// Replaces Mailgun for email receiving
//
module.exports = {
    "apiUrl": process.env.CLOUDFLARE_API_URL || "https://curly-wood-ce28.k3yt07.workers.dev",
    "emailDomain": process.env.EMAIL_DOMAIN || "akunlama.com",
    "adminAccessKey": process.env.ADMIN_ACCESS_KEY || "",
    //"corsOrigin"    : "*"
}
