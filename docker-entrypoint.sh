#!/bin/sh

#
# Entrypoint start
#
echo ">>---------------------------------------------------------------------"
echo ">> Starting inboxkitten container : Get Mail Nyow!"
echo ">>---------------------------------------------------------------------"

#
# Getting the various configuration settings from command line / environment variable
#
export MAIL_CONFIG=$(echo ${MAIL_CONFIG:-MAILGUN} | tr '[:lower:]' '[:upper:]')
echo ">> MAIL_CONFIG set to: $MAIL_CONFIG"

if [ "$MAIL_CONFIG" = "CLOUDFLARE" ]; then
    if [ -z "$CLOUDFLARE_API_URL" ]; then
        echo "[FATAL ERROR] Missing CLOUDFLARE_API_URL";
        exit 1;
    fi
    if [ -z "$EMAIL_DOMAIN" ]; then
        echo "[FATAL ERROR] Missing EMAIL_DOMAIN";
        exit 1;
    fi
    echo ">> Detected CLOUDFLARE configuration";
    # For UI compatibility, we might still need to set MAILGUN_EMAIL_DOMAIN if the UI expects it as a fallback
    export MAILGUN_EMAIL_DOMAIN="$EMAIL_DOMAIN"
else
    if [ -z "$MAILGUN_EMAIL_DOMAIN" ]; then
        echo "[FATAL ERROR] Missing MAILGUN_EMAIL_DOMAIN (eg: inboxkitten.com)";
        exit 1;
    fi
    if [ -z "$MAILGUN_API_KEY" ]; then
        echo "[FATAL ERROR] Missing MAILGUN_API_KEY";
        exit 1;
    fi
    echo ">> Detected MAILGUN configuration";
fi

if [ -z "$WEBSITE_DOMAIN" ]; then
	echo ">> Missing WEBSITE_DOMAIN, using MAILGUN_EMAIL_DOMAIN : $MAILGUN_EMAIL_DOMAIN"
    export WEBSITE_DOMAIN="$MAILGUN_EMAIL_DOMAIN"
else
	echo ">> Detected WEBSITE_DOMAIN env variable : $WEBSITE_DOMAIN";
fi

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

#
# End of env variable checks
# Moving to config setups
#
echo ">>---------------------------------------------------------------------"

# Debug check
# ls /application/

#
# Setup the UI
#
echo ">> Setting up UI"

# Clone the files
rm -rf /application/api/public/
mkdir /application/api/public/
cp -r /application/ui-dist/* /application/api/public/

# Debug check
# ls /application/api/public/

# Search token (so that it does not get character substituted)
TOKEN_MAILGUN_EMAIL_DOMAIN='${MAILGUN_EMAIL_DOMAIN}'
TOKEN_WEBSITE_DOMAIN='${WEBSITE_DOMAIN}'

# Find and replace
find /application/api/public/ -type f -exec sed -i "s/$TOKEN_MAILGUN_EMAIL_DOMAIN/$MAILGUN_EMAIL_DOMAIN/g" {} +
find /application/api/public/ -type f -exec sed -i "s/$TOKEN_WEBSITE_DOMAIN/$WEBSITE_DOMAIN/g" {} +

#
# Setup the API
#
echo ">> Setting up API config"
if [ "$MAIL_CONFIG" = "CLOUDFLARE" ]; then
    cat "/application/api/config/cloudflareConfig.sample.js" | envsubst > "/application/api/config/cloudflareConfig.js"
else
    cat "/application/api/config/mailgunConfig.sample.js" | envsubst > "/application/api/config/mailgunConfig.js"
fi

#
# Start the server
#
echo ">>---------------------------------------------------------------------"
echo ">> Starting the server"
echo ">>---------------------------------------------------------------------"
cd /application/api/
npm start 