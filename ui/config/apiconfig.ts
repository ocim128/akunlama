interface ApiConfig {
  apiUrl: string;
  domain: string;
}

// @ts-ignore
const config: ApiConfig = {
  apiUrl: import.meta.env.WEBSITE_DOMAIN
    ? `//${import.meta.env.WEBSITE_DOMAIN}/api/v1/mail`
    : '//localhost:8000/api/v1/mail',
  domain: import.meta.env.MAILGUN_EMAIL_DOMAIN || ''
};

export default config;