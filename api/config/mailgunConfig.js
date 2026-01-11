//
// API key and valid mailgun domain supported (using sandbox)
// Updated for direct process.env support (Vercel/Serverless compatible)
//
module.exports = {
	"apiKey": process.env.MAILGUN_API_KEY || "",
	"emailDomain": process.env.MAILGUN_EMAIL_DOMAIN || "",
	"adminAccessKey": process.env.ADMIN_ACCESS_KEY || "",
	//"corsOrigin"  : "*"
}
