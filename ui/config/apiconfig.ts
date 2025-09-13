import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface ApiConfig {
  apiUrl: string;
  domain: string;
}

const config: ApiConfig = {
  apiUrl: process.env.WEBSITE_DOMAIN
    ? `//${process.env.WEBSITE_DOMAIN}/api/v1/mail`
    : '//localhost:8000/api/v1/mail',
  domain: process.env.MAILGUN_EMAIL_DOMAIN || ''
};

export default config;