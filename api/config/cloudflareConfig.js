//
// Cloudflare Email Worker API configuration
// Updated for direct process.env support (Vercel/Serverless compatible)
//
module.exports = {
    "apiUrl": process.env.CLOUDFLARE_API_URL || "",
    "emailDomain": process.env.EMAIL_DOMAIN || "",
    "adminAccessKey": process.env.ADMIN_ACCESS_KEY || "",
    //"corsOrigin"    : "*"
}
