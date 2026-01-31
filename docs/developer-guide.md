# Developer Onboarding Guide

Welcome to the Akunlama project! This guide will help you set up your development environment and get started with contributing.

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js**: v18 or higher
- **npm**: v9 or higher
- **Git**: For version control
- **Cloudflare Wrangler**: `npm install -g wrangler` (for Worker development)

## Project Structure

The project is a monorepo-style structure with two main applications:

- `ui/`: The Frontend application (Vue.js + Vite)
- `cloudflare-email/`: The Backend application (Cloudflare Worker)
- `docs/`: Project documentation
- `plans/`: Refactoring and improvement plans

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/akunlama.git
cd akunlama
```

### 2. UI Setup

Navigate to the `ui` directory and install dependencies:

```bash
cd ui
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

### 3. Backend Setup

Navigate to the `cloudflare-email` directory and install dependencies:

```bash
cd ../cloudflare-email
npm install
```

Create a local environment file:

```bash
cp .env.example .env
```

## Running Locally

### Start the UI

In the `ui` directory:

```bash
npm run dev
```
The app will be available at `http://localhost:5173`.

### Start the Backend (Worker)

In the `cloudflare-email` directory:

```bash
npx wrangler dev
```
The API will be available at `http://localhost:8787` (default Wrangler port).

**Note:** You may need to update `VITE_API_URL` in your `ui/.env` to point to `http://localhost:8787/api` if you want the local UI to talk to the local Worker.

## Development Workflow

1.  **Create a Branch**: Always work on a feature branch (`git checkout -b feature/my-feature`).
2.  **Make Changes**: Edit code in `ui/` or `cloudflare-email/`.
3.  **Test**: Run tests (see below) to ensure no regressions.
4.  **Commit**: Use descriptive commit messages.

## Testing

### UI Tests

```bash
cd ui
npm run test:unit      # Run unit tests
npm run test:e2e       # Run E2E tests (Playwright)
```

### Worker Tests

*Currently, the worker uses manual testing via `wrangler dev`.*

## Deployment

The project is deployed on Cloudflare.

- **UI**: Deployment is handled via Cloudflare Pages (usually automated on push to `main`).
- **Worker**: Deployment is done via Wrangler.

```bash
cd cloudflare-email
npx wrangler deploy
```

## Common Commands

| Command | Directory | Description |
|---------|-----------|-------------|
| `npm run dev` | `ui/` | Start UI dev server |
| `npx wrangler dev` | `cloudflare-email/` | Start Worker dev server |
| `npx wrangler tail` | `cloudflare-email/` | View live production logs |
| `npm run build` | `ui/` | Build UI for production |
