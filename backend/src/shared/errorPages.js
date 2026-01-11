/**
 * Shared error page templates
 * Used by both Mailgun and Cloudflare email HTML handlers
 */

/**
 * Generate HTML for email not found (404) error
 * @returns {string} HTML content
 */
const getEmailNotFoundHtml = () => `
<!DOCTYPE html>
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
                text-align: left;
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
</html>`;

/**
 * Get script to inject into email HTML for opening links in new tabs
 * @returns {string} Script tag
 */
const getLinkTargetScript = () =>
    '<script>' +
    'let linkArray = document.getElementsByTagName("a");' +
    'for (let i=0; i<linkArray.length; ++i) { linkArray[i].target="_blank"; }' +
    '<\\/script>';

/**
 * Get default message when no email body is found
 * @returns {string}
 */
const getNoEmailBodyMessage = () => 'The kittens found no messages :(';

module.exports = {
    getEmailNotFoundHtml,
    getLinkTargetScript,
    getNoEmailBodyMessage
};
