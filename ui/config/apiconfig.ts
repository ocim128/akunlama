interface ApiConfig {
  apiUrl: string;
  domain: string;
}

// @ts-ignore
const config: ApiConfig = {
  apiUrl: import.meta.env.VITE_WEBSITE_DOMAIN
    ? `//${import.meta.env.VITE_WEBSITE_DOMAIN}/api/v1/mail`
    : import.meta.env.WEBSITE_DOMAIN
      ? `//${import.meta.env.WEBSITE_DOMAIN}/api/v1/mail`
      : '//localhost:8000/api/v1/mail',
  domain: import.meta.env.VITE_MAILGUN_EMAIL_DOMAIN || import.meta.env.MAILGUN_EMAIL_DOMAIN || ''
};

export default config;