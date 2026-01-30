// apiconfig.cloudflare.js - Configuration for Cloudflare Pages deployment
// Points directly to Cloudflare Worker API (no backend proxy needed)

export default {
    // Cloudflare Worker URL
    // For testing: akunlama-worker-test.k3yt07.workers.dev (gratis-ongkir.com)
    // For production: akunlama-prod.k3yt07.workers.dev (akunlama.com)
    apiUrl: import.meta.env.VITE_API_URL || 'https://akunlama.com/api',

    // Email domain for the disposable email service
    domain: import.meta.env.VITE_WEBSITE_DOMAIN || 'akunlama.com'
}
