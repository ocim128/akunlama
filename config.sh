#!/bin/bash

# Deploy will terminate on any error
set -e

# Firebase Working directory
projectDir="`dirname \"$0\"`"
cd "$projectDir" || exit 1
projectDir="`pwd`"

#
# Scanning and installing dependencies
# (Assuming a mac)
#
if [ -z "$(which npm)" ]; then
	echo ">> NPM not detected : please install =["
	exit 1;
fi
if [ -z "$(which node)" ]; then
	echo ">> node not detected : please install =["
	exit 1;
fi
if [ -z "$(which go)" ]; then
	echo ">> go not detected : please install =["
	exit 1;
fi

#
# Load environment variables from .env file if it exists
#
if [ -f "$projectDir/.env" ]; then
    echo ">> Loading environment variables from .env file"
    export $(cat "$projectDir/.env" | grep -v '^#' | xargs)
else
    echo ">> Warning: .env file not found. Using existing environment variables."
fi

#
# Check required environment variables
#
if [ -z "$MAILGUN_EMAIL_DOMAIN" ]; then
	echo ">> ERROR: MAILGUN_EMAIL_DOMAIN is not set. Please set it in your .env file or environment."
	exit 1;
fi

if [ -z "$WEBSITE_DOMAIN" ]; then
	echo ">> ERROR: WEBSITE_DOMAIN is not set. Please set it in your .env file or environment."
	exit 1;
fi

# Set VITE_ environment variables for frontend
export VITE_MAILGUN_EMAIL_DOMAIN="$MAILGUN_EMAIL_DOMAIN"
export VITE_WEBSITE_DOMAIN="$WEBSITE_DOMAIN"

if [ -z "$MAILGUN_API_KEY" ]; then
	echo ">> ERROR: MAILGUN_API_KEY is not set. Please set it in your .env file or environment."
	exit 1;
fi

if [ -z "$ADMIN_ACCESS_KEY" ]; then
	echo ">> ERROR: ADMIN_ACCESS_KEY is not set. Please set it in your .env file or environment."
	exit 1;
fi

#
# Display configuration (without sensitive data)
#
echo ">> Configuration loaded:"
echo "   MAILGUN_EMAIL_DOMAIN: $MAILGUN_EMAIL_DOMAIN"
echo "   WEBSITE_DOMAIN: $WEBSITE_DOMAIN"
echo "   VITE_MAILGUN_EMAIL_DOMAIN: $VITE_MAILGUN_EMAIL_DOMAIN"
echo "   VITE_WEBSITE_DOMAIN: $VITE_WEBSITE_DOMAIN"
echo "   MAILGUN_API_KEY: [REDACTED]"
echo "   ADMIN_ACCESS_KEY: [REDACTED]"

#
# Install dependencies
#
echo ">> Installing dependencies"
npm install

#
# Environment variables for frontend
# Vite will now use the regular environment variables directly
# (No need for VITE_ prefix with our updated configuration)
#

#
# Applying the configuration (using envsubst for frontend variables)
#
echo ">> Applying config settings"
# API config already uses process.env, no substitution needed
# UI config needs substitution for Vite
# UI config now uses import.meta.env, no substitution needed