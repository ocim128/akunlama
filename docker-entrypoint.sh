#!/bin/sh

# Entrypoint start
echo ">>---------------------------------------------------------------------"
echo ">> Starting inboxkitten container : Get Mail Nyow!"
echo ">>---------------------------------------------------------------------"

# Getting the various configuration settings from command line / environment variable
if [ -z "$MAILGUN_EMAIL_DOMAIN" ]; then
	echo "[FATAL ERROR] Missing MAILGUN_EMAIL_DOMAIN (eg: inboxkitten.com)";
    exit 1;
else
	echo ">> Detected MAILGUN_EMAIL_DOMAIN env variable : $MAILGUN_EMAIL_DOMAIN";
fi

if [ -z "$MAILGUN_API_KEY" ]; then
	echo "[FATAL ERROR] Missing MAILGUN_API_KEY";
	exit 1;
else
	echo ">> Detected MAILGUN_API_KEY env variable : [intentionally redacted]";
fi

if [ -z "$WEBSITE_DOMAIN" ]; then
	echo ">> Missing WEBSITE_DOMAIN, using MAILGUN_EMAIL_DOMAIN : $MAILGUN_EMAIL_DOMAIN"
    export WEBSITE_DOMAIN="$MAILGUN_EMAIL_DOMAIN"
else
	echo ">> Detected WEBSITE_DOMAIN env variable : $WEBSITE_DOMAIN";
fi

# Set VITE environment variables for build time
export VITE_MAILGUN_EMAIL_DOMAIN="$MAILGUN_EMAIL_DOMAIN"
export VITE_WEBSITE_DOMAIN="$WEBSITE_DOMAIN"

# Optional banned usernames
if [ -n "$BANNED_USERNAMES" ]; then
    echo ">> Detected BANNED_USERNAMES env variable : [redacted for security]";
else
    echo ">> No BANNED_USERNAMES specified (optional)";
fi

# Optional banned IP addresses
if [ -n "$BANNED_IPS" ]; then
    echo ">> Detected BANNED_IPS env variable : [redacted for security]";
else
    echo ">> No BANNED_IPS specified (optional)";
fi

# End of env variable checks
# Moving to config setups
echo ">>---------------------------------------------------------------------"

# Setup the UI
echo ">> Setting up UI"

# Clone the files
rm -rf /application/api/public/
mkdir -p /application/api/public/
cp -r /application/ui-dist/* /application/api/public/

# Search token (so that it does not get character substituted)
TOKEN_MAILGUN_EMAIL_DOMAIN='${MAILGUN_EMAIL_DOMAIN}'
TOKEN_WEBSITE_DOMAIN='${WEBSITE_DOMAIN}'

# Find and replace in HTML/JS files
find /application/api/public/ -type f \( -name "*.html" -o -name "*.js" -o -name "*.json" \) -exec sed -i "s/$TOKEN_MAILGUN_EMAIL_DOMAIN/$MAILGUN_EMAIL_DOMAIN/g" {} +
find /application/api/public/ -type f \( -name "*.html" -o -name "*.js" -o -name "*.json" \) -exec sed -i "s/$TOKEN_WEBSITE_DOMAIN/$WEBSITE_DOMAIN/g" {} +

# Setup the API config
echo ">> Setting up API config"
if [ -f "/application/api/config/mailgunConfig.sample.js" ]; then
    cat "/application/api/config/mailgunConfig.sample.js" | envsubst > "/application/api/config/mailgunConfig.js"
fi

# Start the server
echo ">>---------------------------------------------------------------------"
echo ">> Starting the server"
echo ">>---------------------------------------------------------------------"
cd /application/api/
npm start