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

Set these environment variables:

```bash
MAIL_CONFIG=CLOUDFLARE
CLOUDFLARE_API_URL=https://your-worker.workers.dev
CLOUDFLARE_API_KEY=your-api-key
EMAIL_DOMAIN=your-domain.com
```

See [cloudflare-email/](./cloudflare-email/) for Cloudflare Worker setup.

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
