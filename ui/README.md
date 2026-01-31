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

### Prerequisites
1. **Cloudflare Account**: You need a Cloudflare account with Pages enabled.
2. **Wrangler CLI**: Installed via npm (included in devDependencies).
3. **Authentication**: Login to Cloudflare via CLI:
   ```bash
   npx wrangler login
   ```

### Step-by-Step Deployment
Follow these steps to deploy the latest version of the UI:

```bash
# 1. Build the production assets
npm run build

# 2. Deploy the dist directory to Cloudflare Pages
npx wrangler pages deploy dist --project-name=akunlama-ui --branch=main
```

> **Note**: If you are deploying for the first time, Wrangler will prompt you to create the project. You can also manage settings through the [Cloudflare Dashboard](https://dash.cloudflare.com/).


## Configuration

Set environment variables via Cloudflare Pages or in `.env`:

```env
VITE_API_URL=https://akunlama.com/api
VITE_WEBSITE_DOMAIN=akunlama.com
```

For a complete list of configuration options, see the [Configuration Reference](../docs/configuration.md).
