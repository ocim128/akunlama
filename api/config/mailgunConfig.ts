import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface MailgunConfig {
  apiKey: string;
  emailDomain: string;
  adminAccessKey: string;
  corsOrigin?: string;
}

const config: MailgunConfig = {
  apiKey: process.env.MAILGUN_API_KEY || '',
  emailDomain: process.env.MAILGUN_EMAIL_DOMAIN || '',
  adminAccessKey: process.env.ADMIN_ACCESS_KEY || '',
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Validate required environment variables
if (!config.apiKey) {
  throw new Error('MAILGUN_API_KEY environment variable is required');
}

if (!config.emailDomain) {
  throw new Error('MAILGUN_EMAIL_DOMAIN environment variable is required');
}

if (!config.adminAccessKey) {
  throw new Error('ADMIN_ACCESS_KEY environment variable is required');
}

export default config;