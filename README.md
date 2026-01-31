# 🐱 Akunlama - Disposable Email Service

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A free, open-source disposable email service powered by Cloudflare. Create temporary email addresses instantly without signup.

**Live Demo:** [akunlama.com](https://akunlama.com)

## ✨ Features

- 🚀 **Instant Email Addresses** - No signup required, just pick a name
- 🔒 **Privacy First** - Emails auto-delete after 3 days
- 📱 **Responsive Design** - Works on desktop and mobile
- ⚡ **Cloudflare Powered** - Edge-deployed for global performance
- 🛡️ **Spam Filtering** - Auto-blocks spam from Meta/Facebook
- 📊 **Rate Limiting** - Built-in protection against abuse

## 📂 Final Project Structure

```
akunlama/
├── .gitignore           # Simplified for Cloudflare
├── LICENSE
├── README.md            # Updated for Cloudflare deployment
├── cloudflare-email/    # Cloudflare Worker
│   ├── README.md        # Worker documentation
│   ├── src/             # Source code (handlers, routes, services)
│   ├── mime-utils.js    # MIME parsing
│   ├── schema.sql       # D1 database schema
│   └── wrangler.toml    # Wrangler config
└── ui/                  # Vue.js Frontend
    ├── config/
    │   ├── apiconfig.js # Cloudflare API config
    │   └── shareConfig.js
    ├── public/          # Static assets
    ├── src/             # Vue components & logic
    ├── tests/           # Unit & E2E tests
    ├── package.json
    └── README.md        # Updated
```

## 🚀 Deployment

### Prerequisites

1. Cloudflare account with:
   - A domain configured (e.g., `akunlama.com`)
   - Email Routing enabled
   - D1 database created

2. [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed

### 1. Deploy the Worker

```bash
cd cloudflare-email

# Create D1 database (if not exists)
npx wrangler d1 create akunlama

# Apply schema
npx wrangler d1 execute akunlama --remote --file=schema.sql

# Deploy worker
npx wrangler deploy
```

### 2. Configure Email Routing

1. Go to Cloudflare Dashboard → Email → Email Routing
2. Create a catch-all rule: `*@yourdomain.com` → Send to Worker → `akunlama-worker`

### 3. Deploy the UI

```bash
cd ui

# Install dependencies
npm install

# Build
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=akunlama-ui --branch=main
```

### 4. Environment Variables

Set these secrets in your Cloudflare Worker:

| Variable | Description |
|----------|-------------|
| `EMAIL_DOMAIN` | Your email domain (e.g., `akunlama.com`) |
| `ADMIN_ACCESS_KEY` | Secret key for admin access |
| `BANNED_USERNAMES` | Comma-separated list of banned usernames |

```bash
npx wrangler secret put ADMIN_ACCESS_KEY
```

## 🧪 Development

### Run UI locally

```bash
cd ui
npm install
npm run dev
```

### Run tests

```bash
cd ui

# Unit tests
npm test

# E2E tests
npm run test:e2e
```

## 📖 API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/events?recipient=user@domain.com` | List emails for a recipient |
| `GET /api/email/:id?recipient=user@domain.com` | Get email content |
| `GET /api/stream?recipient=user@domain.com` | SSE stream for real-time updates |
| `GET /api/health` | Health check |

## 🔒 Security Features

- **Rate Limiting**: 75 requests/min per IP, 10 unique usernames/min
- **Input Validation**: Username format validation
- **Spam Filtering**: Blocks Meta/Facebook spam automatically
- **CORS**: Configurable cross-origin access
- **ETag Caching**: 304 responses for unchanged data

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original [InboxKitten](https://github.com/uilicious/inboxkitten) by [UIlicious](https://uilicious.com)

---

Made with ❤️ for privacy-conscious users
