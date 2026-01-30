/**
 * Environment Variable Validation
 * 
 * Uses envalid to validate and clean environment variables at startup.
 * Fails fast if required configuration is missing.
 */
const path = require('path');

// Load .env file from project root (works for both backend and docker contexts)
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// Also try backend-local .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const { cleanEnv, str, port, url } = require('envalid');

// Get the mail configuration to determine which variables are required
const mailConfig = (process.env.MAIL_CONFIG || 'MAILGUN').toUpperCase();

/**
 * Validates environment variables based on the selected mail backend
 * @returns {Object} Validated and cleaned environment variables
 */
function validateEnv() {
    // Common validators
    const commonValidators = {
        // Server Configuration
        PORT: port({ default: 8000, desc: 'Port for the API server' }),
        HOST: str({ default: 'localhost', desc: 'Host for the API server' }),
        NODE_ENV: str({
            choices: ['development', 'production', 'test'],
            default: 'development',
            desc: 'Node environment'
        }),

        // Mail Backend Selection
        MAIL_CONFIG: str({
            choices: ['MAILGUN', 'CLOUDFLARE'],
            default: 'MAILGUN',
            desc: 'Email backend to use: MAILGUN or CLOUDFLARE'
        }),

        // Security
        BANNED_IPS: str({
            default: '',
            desc: 'Comma-separated list of banned IP addresses'
        }),
        BANNED_USERNAMES: str({
            default: '',
            desc: 'Comma-separated list of banned usernames'
        }),

        // Domain Configuration
        EMAIL_DOMAIN: str({
            default: 'akunlama.com',
            desc: 'Email domain for the service'
        })
    };

    // Backend-specific validators
    let backendValidators = {};

    if (mailConfig === 'CLOUDFLARE') {
        backendValidators = {
            CLOUDFLARE_API_URL: url({
                desc: 'Cloudflare API worker URL (e.g., https://your-worker.workers.dev)',
                example: 'https://akunlama-fetch.workers.dev'
            }),
            ADMIN_ACCESS_KEY: str({
                desc: 'Admin access key for Cloudflare API authentication'
            })
        };
    } else {
        // MAILGUN configuration
        backendValidators = {
            MAILGUN_API_KEY: str({
                desc: 'Mailgun API key',
                example: 'key-xxxxxx'
            }),
            MAILGUN_EMAIL_DOMAIN: str({
                desc: 'Mailgun email domain',
                example: 'mail.example.com'
            })
        };
    }

    try {
        const env = cleanEnv(process.env, {
            ...commonValidators,
            ...backendValidators
        }, {
            reporter: ({ errors, env }) => {
                const errorKeys = Object.keys(errors);
                if (errorKeys.length > 0) {
                    console.error('\n==========================================');
                    console.error('❌ ENVIRONMENT VALIDATION FAILED');
                    console.error('==========================================');
                    console.error(`Backend: ${mailConfig}`);
                    console.error('\nMissing or invalid environment variables:\n');

                    for (const key of errorKeys) {
                        const error = errors[key];
                        console.error(`  ❌ ${key}: ${error.message}`);
                    }

                    console.error('\n------------------------------------------');
                    console.error('Please check your .env file or environment configuration.');
                    console.error('See README.md for setup instructions.');
                    console.error('==========================================\n');

                    // Exit with error code
                    process.exit(1);
                }
            }
        });

        console.log('✅ Environment validation passed');
        return env;

    } catch (error) {
        console.error('❌ Environment validation error:', error.message);
        process.exit(1);
    }
}

// Export the validated environment
const env = validateEnv();

module.exports = {
    env,

    // Convenience getters
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    isTest: env.NODE_ENV === 'test',

    // Server config
    port: env.PORT,
    host: env.HOST,

    // Mail config
    mailBackend: env.MAIL_CONFIG,
    emailDomain: env.EMAIL_DOMAIN,

    // Security config
    bannedIPs: env.BANNED_IPS ? env.BANNED_IPS.split(',').map(ip => ip.trim()).filter(Boolean) : [],
    bannedUsernames: env.BANNED_USERNAMES ? env.BANNED_USERNAMES.split(',').map(u => u.trim()).filter(Boolean) : [],

    // Backend-specific config (conditional)
    ...(mailConfig === 'CLOUDFLARE' ? {
        cloudflareApiUrl: env.CLOUDFLARE_API_URL,
        adminAccessKey: env.ADMIN_ACCESS_KEY
    } : {
        mailgunApiKey: env.MAILGUN_API_KEY,
        mailgunDomain: env.MAILGUN_EMAIL_DOMAIN
    })
};
