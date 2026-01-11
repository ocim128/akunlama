// Cloudflare version of mailGetHtml.js
// Fetches email HTML content from Cloudflare Worker API
const axios = require('axios');
const cloudflareConfig = require("../../config/cloudflareConfig");
const cacheControl = require("../../config/cacheControl");

/**
 * Get and return the email HTML content from Cloudflare API
 */
module.exports = async function (req, res) {
    const region = req.query.region;
    const key = req.query.key;

    if (!region || region === "") {
        return res.status(400).send('{ "error" : "No `region` param found" }');
    }

    if (!key || key === "") {
        return res.status(400).send('{ "error" : "No `key` param found" }');
    }

    try {
        // Fetch email from Cloudflare API
        const apiUrl = `${cloudflareConfig.apiUrl}/api/email/${encodeURIComponent(key)}`;
        const response = await axios.get(apiUrl, { timeout: 10000 });

        let body = response.data["body-html"] || response.data["body-plain"] || response.data.body_html || response.data.body_text;

        if (!body) {
            body = 'The kittens found no messages :(';
        }

        // Add JS injection to force all links to open as a new tab
        body += '<script>' +
            'let linkArray = document.getElementsByTagName("a");' +
            'for (let i=0; i<linkArray.length; ++i) { linkArray[i].target="_blank"; }' +
            '<\/script>';

        res.set('cache-control', cacheControl.static);
        res.status(200).send(body);

    } catch (error) {
        const is404 = error.response?.status === 404 || error.response?.status === 400;

        if (is404) {
            console.log(`[404] Email not found: ${region}/${key}`);

            const humorousHtml = `
				<html>
					<head>
						<title>Oops! Email Not Found</title>
						<style>
							body {
								font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
								padding: 3rem 2rem;
								text-align: center;
								color: #6B7280;
								background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
								min-height: 100vh;
								margin: 0;
								display: flex;
								align-items: center;
								justify-content: center;
								flex-direction: column;
							}
							.container {
								background: white;
								border-radius: 20px;
								padding: 2rem;
								box-shadow: 0 20px 40px rgba(0,0,0,0.1);
								max-width: 500px;
							}
							.cat-emoji {
								font-size: 4rem;
								margin-bottom: 1rem;
								animation: bounce 2s infinite;
							}
							.title {
								color: #EF4444;
								font-size: 1.5rem;
								margin-bottom: 1rem;
								font-weight: bold;
							}
							.message {
								font-size: 1.1rem;
								line-height: 1.6;
								margin-bottom: 1.5rem;
							}
							.reason {
								background: #F3F4F6;
								border-radius: 10px;
								padding: 1rem;
								font-size: 0.9rem;
								color: #6B7280;
								border-left: 4px solid #EF4444;
							}
							@keyframes bounce {
								0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
								40% { transform: translateY(-10px); }
								60% { transform: translateY(-5px); }
							}
						</style>
					</head>
					<body>
						<div class="container">
							<div class="cat-emoji">🙀</div>
							<div class="title">The kittens ate your email!</div>
							<div class="message">
								This email has wandered off into the digital void. Our disposal kittens work fast! 🐱
							</div>
							<div class="reason">
								<strong>Why did this happen?</strong><br>
								• Email may have expired<br>
								• The email was already disposed of<br>
								• Our kittens were extra hungry today
							</div>
						</div>
					</body>
				</html>
			`;

            res.set('Content-Type', 'text/html');
            res.set('cache-control', cacheControl.static);
            return res.status(404).send(humorousHtml);
        } else {
            console.error(`[ERROR] Mail HTML error ${region}/${key}: ${error.message}`);
            return res.status(500).send("{error: 'Unable to load email'}");
        }
    }
}
