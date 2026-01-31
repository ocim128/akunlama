// API Configuration for Cloudflare Pages deployment
// Points directly to Cloudflare Worker API

export default {
    // Cloudflare Worker API URL
    apiUrl: import.meta.env.VITE_API_URL || 'https://akunlama.com/api',

    // Email domain for the disposable email service
    domain: import.meta.env.VITE_WEBSITE_DOMAIN || 'akunlama.com'
}
