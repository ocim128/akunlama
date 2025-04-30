const mailgun = require('mailgun-js');
const mailgunConfig = require("../../config/mailgunConfig");
const cacheControl = require("../../config/cacheControl");
const mailgunClient = mailgun({
    apiKey: mailgunConfig.apiKey,
    domain: mailgunConfig.emailDomain
});

// --- Banned Usernames (Keep your existing list) ---
const bannedUsernames = new Set([
    "faturrasyidmuhammad07", "diani38071", "pazaleegre", "cemiloktay2",
    "theboybil", "diandikaara", "hawkman7609", "autenticview", "yogiceper25",
    "green14fly", "najman8522", "faradina6986", "wyizrjo2g86kclm",
    "research-population-76", "endangpurwanti0511", "melanyp_andini",
    "obeidtukhisongs", "pedoblicke", "aspakpahtan21", "ardiclops"
    // Add more banned usernames if needed
]);

// --- Rate Limiting Configuration ---
const ipActivity = {}; // Store IP activity: { ip: [{ username: string, timestamp: number }] }
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_USERS = 10; // Max 10 unique usernames per IP per window

const validateUsername = (username) => {
    const lowerCaseUsername = username.toLowerCase(); // Validate against lowercase

    if (bannedUsernames.has(lowerCaseUsername)) {
        throw new Error(`Invalid username: '${username}' is not allowed.`);
    }
    // Allow usernames starting with letters/numbers, containing letters, numbers, ., _, -
    // Ensure it doesn't end with ., _, -
    if (!/^[a-zA-Z0-9]+([._-][a-zA-Z0-9]+)*$/.test(username)) {
        throw new Error(`Invalid username: '${username}' contains invalid characters or format.`);
    }
    return username; // Return original case if needed, or lowerCaseUsername
}

const getEvents = (recipientUsername, res) => {
    mailgunClient.get('/events', {
        recipient: `${recipientUsername}@${mailgunConfig.emailDomain}`, // Use validated username
        event: 'accepted'
    }, (error, body) => {
        if (error) {
            console.error(`Error getting list of messages for ${recipientUsername}:`, error);
            return res.status(500).send({
                error: 'Internal Server Error while fetching emails'
            });
        }

        // Filter emails on the server-side to be absolutely sure
        // Mailgun's recipient filter might sometimes include variations? Better safe.
        const lowerCaseRecipientUsername = recipientUsername.toLowerCase();
        const emails = (body.items || []).filter(email => {
             // Ensure email.recipient exists and is a string before splitting
             if (typeof email.recipient !== 'string') return false;
             const recipientInEmail = email.recipient.split('@')[0].toLowerCase();
             return recipientInEmail === lowerCaseRecipientUsername;
         });

        res.set('cache-control', cacheControl.dynamic);
        // Optional security headers (keep if you had them)
        // res.set('Content-Security-Policy', 'default-src \'self\'');
        // res.set('X-Frame-Options', 'SAMEORIGIN');
        // res.set('X-XSS-Protection', '1; mode=block');
        res.status(200).send(emails);
    });
}

module.exports = (req, res) => {
    const recipient = req.query.recipient;

    if (!recipient) {
        return res.status(400).send({
            error: "No recipient parameter found"
        });
    }

    // Handle potential admin/special case (adjust if needed)
    if (recipient === mailgunConfig.apiKey) {
         // Decide how to handle this case. Fetching all events ('') might be too broad.
         // Maybe return an error or a specific message?
         console.warn("Attempt to access using API key as recipient.");
         return res.status(403).send({ error: "Access Forbidden" });
         // OR if you intended this for an admin view: getEvents('', res);
    }

    // Extract username part
    const usernameParts = recipient.split('@');
    let rawUsername = usernameParts[0];

    // Basic check for disallowed direct domain use
    if (rawUsername.toLowerCase() === "akunlama.com") { // Example, adjust if needed
        return res.status(400).send({
            error: "Direct use of 'akunlama.com' is not allowed as a username"
        });
    }

    let validatedUsername;
    try {
        validatedUsername = validateUsername(rawUsername);
    } catch (error) {
        console.error(`Error validating username '${rawUsername}':`, error.message);
        return res.status(400).send({
            error: error.message // Send the specific validation error
        });
    }

  // --- IP Rate Limiting Logic ---
    // Get IP: Prioritize x-forwarded-for (common for proxies/load balancers), fallback to remoteAddress
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress;

    // ***** DEBUGGING: Log the detected IP *****
    console.log(`[Rate Limit Debug] Detected IP: ${ip || 'Not Found'}`);

    if (ip) { // Only apply rate limiting if IP is found
        console.log(`[Rate Limit Debug] Checking IP: ${ip} for User: ${validatedUsername}`); // Log entry point
        const now = Date.now();
        const windowStart = now - RATE_LIMIT_WINDOW_MS;

        // Initialize records for this IP if it's the first time seen OR if state was lost (serverless)
        ipActivity[ip] = ipActivity[ip] || [];
        const initialCount = ipActivity[ip].length; // How many before filtering?

        // Filter out records older than the time window
        ipActivity[ip] = ipActivity[ip].filter(record => record.timestamp > windowStart);
        const afterFilterCount = ipActivity[ip].length; // How many after filtering?

        // Get unique usernames checked by this IP within the current window
        const uniqueUsernamesInWindow = new Set(ipActivity[ip].map(record => record.username.toLowerCase())); // Compare lowercase
        const uniqueCount = uniqueUsernamesInWindow.size; // Current unique count

        // ***** DEBUGGING: Log counts and window info *****
        console.log(`[Rate Limit Debug] IP: ${ip}, Window Start: ${new Date(windowStart).toISOString()}, Records Before Filter: ${initialCount}, After Filter: ${afterFilterCount}, Unique Users in Window: ${uniqueCount}/${RATE_LIMIT_MAX_USERS}`);
        const isNewUserInWindow = !uniqueUsernamesInWindow.has(validatedUsername.toLowerCase());
        console.log(`[Rate Limit Debug] IP: ${ip}, Is '${validatedUsername.toLowerCase()}' new in window? ${isNewUserInWindow}`);
        if (uniqueCount > 0) {
             console.log(`[Rate Limit Debug] IP: ${ip}, Users in window: ${[...uniqueUsernamesInWindow].join(', ')}`);
        }


        // Check if the *current* (validated) username is NEW for this IP in this window
        if (isNewUserInWindow) {
            console.log(`[Rate Limit Debug] IP: ${ip}, User '${validatedUsername}' is new in window.`);
            // If it's a new username, check if the limit of unique usernames has been reached
            if (uniqueCount >= RATE_LIMIT_MAX_USERS) {
                // ***** DEBUGGING: Log blocking action *****
                console.warn(`[Rate Limit Action] Blocking IP: ${ip}. Limit Reached (${uniqueCount}/${RATE_LIMIT_MAX_USERS}). Tried new user: ${validatedUsername}`);
                res.setHeader('Retry-After', 60); // Inform client to wait 60 seconds
                return res.status(429).send({
                    error: `Too many different mailboxes checked from your IP address in the last minute. Please wait before checking a new one.`
                });
            } else {
                 console.log(`[Rate Limit Debug] IP: ${ip}, New user '${validatedUsername}' allowed. Unique count will become ${uniqueCount + 1}.`);
            }
        } else {
             console.log(`[Rate Limit Debug] IP: ${ip}, User '${validatedUsername}' already seen in window. Allowing re-check.`);
        }

        // Record this access (username + timestamp). This happens whether it was a new user check (below limit)
        // or a re-check of an existing user within the window.
        ipActivity[ip].push({ username: validatedUsername, timestamp: now });
        // ***** DEBUGGING: Log record addition *****
        console.log(`[Rate Limit Debug] IP: ${ip}, Recorded access for ${validatedUsername}. Total records now for IP: ${ipActivity[ip].length}`);

    } else {
        // This case should be rare, but log it if it happens.
        console.warn("[Rate Limit Debug] Could not determine client IP address for rate limiting. Allowing request.");
    }
    // --- End IP Rate Limiting Logic ---

    // Proceed to fetch emails if not rate limited
    console.log(`[Rate Limit Debug] Proceeding to getEvents for ${validatedUsername}`); // Add this line too
    getEvents(validatedUsername, res); // Call the original function

    // Proceed to fetch emails if not rate limited
    // Use the validated username
    getEvents(validatedUsername, res);
};

// --- Optional Cleanup ---
// If memory usage becomes a concern over time with many unique IPs,
// you could implement a periodic cleanup of very old IP entries.
// This simple interval removes IPs that haven't had *any* activity
// within 10 times the rate limit window (e.g., 10 minutes).
setInterval(() => {
    const cleanupThreshold = Date.now() - (RATE_LIMIT_WINDOW_MS * 10);
    for (const ip in ipActivity) {
        // Remove old records within the IP's array first
        ipActivity[ip] = ipActivity[ip].filter(record => record.timestamp > cleanupThreshold);
        // If the IP now has no recent records, remove the IP entry itself
        if (ipActivity[ip].length === 0) {
            delete ipActivity[ip];
            // console.log(`Cleaned up inactive IP entry: ${ip}`); // Optional logging
        }
    }
}, RATE_LIMIT_WINDOW_MS * 10); // Run cleanup every 10 minutes
