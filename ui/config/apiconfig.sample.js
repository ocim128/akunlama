export default {
	apiUrl: '/api/v1/mail',
	domain: import.meta.env.VITE_WEBSITE_DOMAIN || '${MAILGUN_EMAIL_DOMAIN}'
}
