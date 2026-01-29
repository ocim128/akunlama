# 🐱 Akunlama - Open-Source Disposable Email Service

[![Build Status](https://travis-ci.org/uilicious/inboxkitten.svg?branch=master)](https://travis-ci.org/uilicious/inboxkitten)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A free, open-source disposable email service powered by adorably lazy kittens! Based on [InboxKitten](https://inboxkitten.com) - create temporary email addresses instantly without signup.

## ✨ Features

- 🚀 **Instant Email Addresses** - No signup required, just pick a name
- 🔒 **Privacy First** - Emails auto-delete after 24 hours
- 📱 **Responsive Design** - Works on desktop and mobile
- 🌐 **Multiple Email Backends** - Supports Mailgun and Cloudflare Email
- 🐳 **Docker Ready** - Easy deployment with Docker
- ☁️ **Serverless Support** - Deploy to Vercel, Cloudflare Workers
- 🧪 **Fully Tested** - Unit tests with Vitest, E2E tests with Playwright

## 🚀 Quick Start

### Docker Deployment (Recommended)

```bash
docker run \
  -e MAIL_CONFIG="MAILGUN" \
  -e MAILGUN_EMAIL_DOMAIN="<your-domain>" \
  -e MAILGUN_API_KEY="<your-api-key>" \
  -e WEBSITE_DOMAIN="localhost:8000" \
  -p 8000:8000 \
  uilicious/inboxkitten
```

### Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/akunlama.git
cd akunlama

# Install dependencies
cd ui && npm install
cd ../backend && npm install

# Start development servers
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start frontend
cd ui && npm run dev
```

## 📧 Email Backend Configuration

### Option 1: Mailgun (Default)

Set these environment variables:

```bash
MAIL_CONFIG=MAILGUN
MAILGUN_EMAIL_DOMAIN=your-domain.com
MAILGUN_API_KEY=your-api-key
```

> **Note:** Mailgun inbound routing requires a paid account ($35/month minimum).

### Option 2: Cloudflare Email

Set these environment variables in your backend deployment (Vercel, Docker, etc.):

```bash
MAIL_CONFIG=CLOUDFLARE
CLOUDFLARE_API_URL=https://your-fetch-worker.workers.dev
EMAIL_DOMAIN=your-domain.com
ADMIN_ACCESS_KEY=your-secret-key
```

Cloudflare setup (step-by-step):

1) Add your domain to Cloudflare and update nameservers at your registrar.
2) Enable Email Routing for the domain:
   - Cloudflare Dashboard -> Email -> Email Routing -> Set up
3) If migrating from Mailgun:
   - Remove Mailgun MX records
   - Add the Cloudflare MX records shown by Email Routing setup
4) Create a D1 database and apply the schema in `cloudflare-email/README.md`.
5) Deploy the email ingest worker (receives inbound email):
   - Use `cloudflare-email/email-worker.js` (or your ingest worker script)
   - Bind the D1 database as `DB` (binding name is case-sensitive)
6) Create an Email Routing rule for the domain:
   - Match `*@your-domain.com`
   - Action: Send to Worker -> select your ingest worker
7) Deploy the fetch/API worker (for the app to read emails):
   - Use `cloudflare-email/api-worker.js`
   - Bind the same D1 database as `DB` (binding name is case-sensitive)
   - Set secret `ADMIN_ACCESS_KEY`
8) Point your backend to the fetch worker:
   - `CLOUDFLARE_API_URL=https://your-fetch-worker.workers.dev`
   - `EMAIL_DOMAIN=your-domain.com`
   - `ADMIN_ACCESS_KEY=your-secret-key`
9) Verify:
   - Fetch worker health: `https://your-fetch-worker.workers.dev/api/health`
   - Send a test email and confirm it appears in the UI

Notes:
- Domains are connected via Email Routing rules, not inside the worker code.
- D1 is connected to a worker via its binding name `DB` (this code expects `env.DB`).
- For multiple domains, use separate workers and separate D1 databases to avoid mixing mailboxes.

Troubleshooting (common 500 errors):
- `/api/events` returns 500: the worker cannot query D1. Check:
  - D1 binding name is exactly `DB`
  - Worker is bound to the correct D1 database (same one you created tables in)
  - `emails` table exists in D1

See [cloudflare-email/](./cloudflare-email/) for the worker scripts and D1 schema.

## 🧪 Testing

### Unit Tests (Vitest)

```bash
cd ui

# Run tests in watch mode
npm test

# Run tests once
npm run test:unit

# Run with coverage
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
cd ui

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui

# Run headed (see browser)
npm run test:e2e:headed
```

## 📁 Project Structure

```
akunlama/
├── ui/                    # Vue.js frontend
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── scss/          # Stylesheets
│   │   └── router/        # Vue Router config
│   ├── tests/
│   │   ├── unit/          # Vitest unit tests
│   │   └── e2e/           # Playwright E2E tests
│   └── config/            # Frontend configuration
├── backend/               # Express.js API server
│   ├── src/
│   │   ├── api/           # API endpoints
│   │   └── shared/        # Shared utilities
│   └── config/            # Backend configuration
├── cloudflare-email/      # Cloudflare Email Worker
├── cli/                   # CLI tools
└── deploy/                # Deployment scripts
```

## 🚀 Deployment Options

| Platform | Guide |
|----------|-------|
| Docker | [Docker Deployment](#docker-deployment-recommended) |
| Vercel | [DEPLOY-GUIDE-SERVERLESS.md](./DEPLOY-GUIDE-SERVERLESS.md) |
| Localhost | [DEPLOY-GUIDE-LOCALHOST.md](./DEPLOY-GUIDE-LOCALHOST.md) |
| Cloudflare Workers | [cloudflare-email/](./cloudflare-email/) |

## 📖 Documentation

- [Code Guide](./CODE-GUIDE.md) - Coding standards and architecture
- [Optimization Guide](./OPTIMIZATIONS.md) - Performance optimizations
- [Docker Notes](./docker-notes.md) - Docker-specific configuration

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Original [InboxKitten](https://github.com/uilicious/inboxkitten) by [UIlicious](https://uilicious.com)
- All the adorable kittens who power this service ☀️🐱

---

Made with ❤️ and 🐱 for fellow humans who value privacy
