// Loading mailgun reader and config
const mailgunReader = require("../mailgunReader");
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl  = require("../../config/cacheControl");

const reader = new mailgunReader(mailgunConfig);

/**
 * Get and return the static email header details from the mailgun API given the mailKey
 *
 * @param {*} req
 * @param {*} res
 */
module.exports = function(req, res){

	let region = req.query.region
	let key = req.query.key
	
	if (region == null || region === ""){
		return res.status(400).send('{ "error" : "No `region` param found" }');
	}

	if (key == null || key === ""){
		return res.status(400).send('{ "error" : "No `key` param found" }');
	}
	
	reader.getKey({region, key}).then(response => {
		let emailDetails = {}

		// Format and extract the name of the user
		let [name, ...rest] = formatName(response.from)
		emailDetails.name = name

		// Extract the rest of the email domain after splitting
		if (rest[0].length > 0) {
			emailDetails.emailAddress = ' <' + rest
		}

		// Extract the subject of the response
		emailDetails.subject = response.subject

		// Extract the recipients
		emailDetails.recipients = response.recipients

		// Return with cache control
		res.set('cache-control', cacheControl.static)
		res.status(200).send(emailDetails)
	})
	.catch(e => {
		// Check if this is a 404/400 error (expired/missing email)
		const is404 = (e.response && (e.response.status === 404 || e.response.status === 400)) || 
		              (e.message && (e.message.includes('404') || e.message.includes('400'))) ||
		              (e.toString && (e.toString().includes('404') || e.toString().includes('400')));
		
		if (is404) {
			console.log(`[404] Email expired: ${region}/${key}`)
			
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
								• Email expired due to Mailgun's retention policy<br>
								• The email was already disposed of<br>
								• Our kittens were extra hungry today
							</div>
						</div>
					</body>
				</html>
			`
			
			res.set('Content-Type', 'text/html')
			res.set('cache-control', cacheControl.static)
			return res.status(404).send(humorousHtml)
		} else {
			// For other errors, log minimal info and return generic error
			console.error(`[ERROR] Mail info error ${region}/${key}: ${e.message}`)
			return res.status(500).send("{error: 'Unable to load email details'}")
		}
	});
}

function formatName (sender) {
	let [name, ...rest] = sender.split(' <')
	return [name, rest]
}
