# Akunlama UI

Vue.js frontend for the Akunlama disposable email service.

## Development

```bash
# Install dependencies
npm install

# Start dev server (localhost:5173)
npm run dev

# Build for production
npm run build
```

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## Deployment

```bash
# Build and deploy to Cloudflare Pages
npm run build
npx wrangler pages deploy dist --project-name=akunlama-ui --branch=main
```

## Configuration

Set environment variables via Cloudflare Pages or in `.env`:

```env
VITE_API_URL=https://akunlama.com/api
VITE_WEBSITE_DOMAIN=akunlama.com
```
