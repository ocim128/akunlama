
1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.

2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" -> "Write tests for invalid inputs, then make them pass"
"Fix the bug" -> "Write a test that reproduces it, then make it pass"
"Refactor X" -> "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:


1. [Step] -> verify: [check]
2. [Step] -> verify: [check]
3. [Step] -> verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.


5. Use the model only for judgment calls
Use for: classification, drafting, summarization, extraction.
Do NOT use for: routing, retries, status-code handling, deterministic transforms.
If code can answer, code answers.

6. Surface conflicts, don't average them
If two patterns contradict, pick one (more recent / more tested).
Explain why. Flag the other for cleanup.
Don't blend conflicting patterns.

7. Read before you write
Before adding code, read exports, immediate callers, shared utilities.
If unsure why existing code is structured a certain way, ask.

8. Tests verify intent, not just behavior
Tests must encode WHY behavior matters, not just WHAT it does.
A test that can't fail when business logic changes is wrong.

9. Checkpoint after every significant step
Summarize what was done, what's verified, what's left.
Don't continue from a state you can't describe back.
If you lose track, stop and restate.

10. Match the codebase's conventions, even if you disagree
Conformance > taste inside the codebase.
If you think a convention is harmful, surface it. Don't fork it silently.

11. Fail loud
"Completed" is wrong if anything was skipped silently.
"Tests pass" is wrong if any were skipped.
Default to surfacing uncertainty, not hiding it.


# AGENTS.md - AI Agent Guide for Akunlama

> This file provides context and guidance for AI agents working on the Akunlama codebase.

## Project Overview

**Akunlama** is a free, open-source disposable email service. Users can instantly create temporary email addresses without signup. Emails auto-delete after 3 days for privacy.

- **Live Site**: https://akunlama.com
- **License**: MIT (originally forked from InboxKitten)
- **Repository Structure**: Monorepo with separate UI and Worker packages

## Architecture

```
┌─────────────┐      HTTPS       ┌──────────────────┐
│   Vue.js    │ ◄──────────────► │  Cloudflare      │
│   UI        │                  │  Worker          │
│  (Pages)    │                  │  (API + Email)   │
└─────────────┘                  └────────┬─────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Cloudflare  │
                                   │  D1 (SQLite) │
                                   └──────────────┘
                                          ▲
                                          │
┌─────────────┐      Email       ┌────────┴─────────┐
│   Sender    │ ───────────────► │  Cloudflare      │
│             │                  │  Email Routing   │
└─────────────┘                  └──────────────────┘
```

### Key Components

1. **UI (`ui/`)** - Vue.js 3 SPA
   - Build tool: Vite
   - Styling: SCSS
   - State: Pinia
   - Icons: FontAwesome
   - Testing: Vitest (unit) + Playwright (E2E)
   - Deployed to: Cloudflare Pages

2. **Worker (`cloudflare-email/`)** - Cloudflare Worker
   - Runtime: V8 Isolate (Edge)
   - Language: TypeScript
   - Database: Cloudflare D1
   - Entry points:
     - `fetch`: HTTP API requests
     - `email`: Inbound email processing
     - `scheduled`: Cron cleanup jobs
   - Deployed to: Cloudflare Workers

3. **Database** - Cloudflare D1 (SQLite)
   - Single table: `emails`
   - Schema: See `cloudflare-email/schema.sql`

## Directory Structure

```
akunlama/
├── cloudflare-email/          # Backend Worker
│   ├── src/
│   │   ├── index.ts           # Main entry point (exports handlers)
│   │   ├── handlers/
│   │   │   ├── api.ts         # HTTP API router
│   │   │   ├── email.ts       # Inbound email processor
│   │   │   └── scheduled.ts   # Cron cleanup handler
│   │   ├── routes/
│   │   │   ├── events.ts      # GET /api/events
│   │   │   ├── stream.ts      # GET /api/stream (SSE)
│   │   │   ├── email-content.ts  # GET /api/email/:id
│   │   │   ├── admin.ts       # Health, debug, cleanup
│   │   │   └── legacy.ts      # Backwards compatibility
│   │   ├── services/
│   │   │   ├── rate-limiter.ts
│   │   │   ├── email-filter.ts
│   │   │   └── cleanup.ts
│   │   ├── utils/
│   │   │   ├── mime.ts        # MIME parsing utilities
│   │   │   ├── http.ts        # HTTP helpers
│   │   │   └── validation.ts
│   │   ├── types/
│   │   │   └── index.d.ts
│   │   └── config.ts
│   ├── schema.sql             # D1 database schema
│   ├── wrangler.akunlama.toml # Config for akunlama.com
│   ├── wrangler.gratis-ongkir.toml  # Config for gratis-ongkir.com
│   ├── vitest.config.js
│   └── package.json
│
├── ui/                        # Frontend
│   ├── src/
│   │   ├── App.vue
│   │   ├── LandingPage.vue
│   │   ├── KittenRouter.vue
│   │   ├── components/
│   │   │   ├── mail/          # Inbox, email list, detail views
│   │   │   ├── landing/       # Hero, FAQ, email form
│   │   │   ├── common/        # Footer, inputs
│   │   │   └── ui/            # PullToRefresh, SkeletonLoader
│   │   ├── router/
│   │   ├── scss/              # Global styles
│   │   ├── plugins/
│   │   └── assets/
│   ├── tests/
│   │   ├── unit/
│   │   └── e2e/
│   ├── vite.config.ts
│   └── package.json
│
├── docs/                      # Documentation
│   ├── architecture.md
│   ├── api.md
│   ├── developer-guide.md
│   ├── configuration.md
│   └── troubleshooting.md
│
└── plans/                     # Future plans / refactoring notes
```

## Technology Stack

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Build**: Vite 5
- **Router**: Vue Router 4
- **State**: Pinia
- **HTTP**: Axios
- **Styling**: SCSS + Normalize.css
- **Icons**: FontAwesome 6
- **Utilities**: dayjs, DOMPurify, clipboard.js, mitt (event bus)

### Backend
- **Runtime**: Cloudflare Workers
- **Language**: TypeScript 5
- **DB**: Cloudflare D1 (SQLite)
- **Testing**: Vitest

### Deployment
- **UI**: Cloudflare Pages
- **Worker**: Cloudflare Workers
- **Email**: Cloudflare Email Routing

## Development Workflow

### Prerequisites
- Node.js 18+
- npm 9+
- Wrangler CLI: `npm install -g wrangler`

### Local Development

```bash
# Terminal 1: Start UI
cd ui
npm install
npm run dev          # http://localhost:5173

# Terminal 2: Start Worker
cd cloudflare-email
npm install
npx wrangler dev     # http://localhost:8787
```

The UI is configured to proxy `/api` requests to `http://localhost:8080` (see `vite.config.ts`). Adjust if your worker runs on a different port.

### Testing

```bash
# UI Unit Tests
cd ui
npm test

# UI E2E Tests
cd ui
npm run test:e2e

# Worker Tests
cd cloudflare-email
npm test
```

## Multi-Domain Architecture

The project supports **multiple domains** from a single codebase:

| Domain | Config File | Worker Name | Database |
|--------|-------------|-------------|----------|
| akunlama.com | `wrangler.akunlama.toml` | `akunlama-prod` | `akunlama` |
| gratis-ongkir.com | `wrangler.gratis-ongkir.toml` | `worker-email-gratis-ongkir` | `gratis-ongkir-emails` |

Each domain has:
- Separate D1 database (isolated data)
- Separate Worker deployment
- Separate secrets

### Adding a New Domain

1. Copy config: `cp wrangler.akunlama.toml wrangler.newdomain.toml`
2. Update `name`, `database_name`, `database_id`, `EMAIL_DOMAIN` in new config
3. Create D1 DB: `npx wrangler d1 create newdomain-emails`
4. Apply schema: `npx wrangler d1 execute newdomain-emails --remote --file=schema.sql`
5. Deploy: `npx wrangler deploy --config wrangler.newdomain.toml`
6. Set secret: `npx wrangler secret put ADMIN_ACCESS_KEY --config wrangler.newdomain.toml`
7. Configure Cloudflare Dashboard (Email Routing + Worker Routes)

## Configuration

### Worker Environment Variables (`wrangler.toml` `[vars]`)

| Variable | Description |
|----------|-------------|
| `EMAIL_DOMAIN` | Domain for email addresses |
| `BANNED_USERNAMES` | Comma-separated blocked usernames |
| `BLOCKED_SENDER_KEYWORDS` | Block emails from these senders |
| `BLOCKED_SUBJECT_KEYWORDS` | Block emails with these subjects |

### Worker Secrets (`wrangler secret put`)

| Secret | Description |
|--------|-------------|
| `ADMIN_ACCESS_KEY` | Key for admin access (`recipient=*` queries) |

### UI Environment Variables (`.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `https://akunlama.com/api` | Backend API URL |
| `VITE_WEBSITE_DOMAIN` | `akunlama.com` | Domain for emails |
| `VITE_AUTO_REFRESH_INTERVAL` | `30000` | Poll interval (ms) |
| `VITE_REQUEST_TIMEOUT` | `10000` | Axios timeout (ms) |

## Key Code Patterns

### Worker Handlers

```typescript
// handlers/api.ts - Route registry pattern
const ROUTES: RouteRegistry = {
    '/api/events': { handler: handleEvents, methods: ['GET'] },
    '/api/health': { handler: handleHealth, methods: ['GET'] },
};

// handlers/email.ts - Email processing
export async function handleEmail(
    message: IncomingEmail,
    env: EmailHandlerEnv,
    ctx: ExecutionContext
): Promise<void> {
    // Parse MIME, filter spam, store to D1
}
```

### Database Queries

```typescript
// Always use parameterized queries
await env.DB.prepare(`
    INSERT INTO emails (id, recipient, sender, subject, received_at)
    VALUES (?, ?, ?, ?, ?)
`).bind(emailId, recipient, sender, subject, Date.now()).run();
```

### Vue Components

```vue
<script setup lang="ts">
// Composition API pattern used throughout
import { ref, computed, onMounted } from 'vue';

const emails = ref<Email[]>([]);
const loading = computed(() => emails.value.length === 0);

onMounted(async () => {
    emails.value = await fetchEmails();
});
</script>
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/events?recipient=` | GET | List emails for recipient |
| `/api/email/:id` | GET | Get email content |
| `/api/email/:id/read` | PATCH | Mark as read |
| `/api/stream?recipient=` | GET | SSE real-time updates |
| `/api/health` | GET | Health check |
| `/api/cleanup` | POST | Trigger manual cleanup |

## Security Considerations

1. **Rate Limiting**: 75 req/min per IP, 10 usernames/min
2. **Input Validation**: Username format validation in `validation.ts`
3. **Admin Access**: `recipient=*` requires valid `admin_key` parameter
4. **CORS**: Configurable cross-origin headers
5. **Email Filtering**: Spam blocking via keyword filters
6. **Data Retention**: Auto-delete emails after 3 days

## Common Tasks

### Deploy Worker (specific domain)
```bash
cd cloudflare-email
npx wrangler deploy --config wrangler.akunlama.toml
```

### View Logs
```bash
cd cloudflare-email
npx wrangler tail --config wrangler.akunlama.toml
```

### Deploy UI
```bash
cd ui
npm run build
npx wrangler pages deploy dist --project-name=akunlama-ui --branch=main
```

### Database Migration
```bash
cd cloudflare-email
npx wrangler d1 execute akunlama --remote --file=schema.sql
```

## Important Notes for AI Agents

1. **Always check both UI and Worker** when making changes - they are tightly coupled
2. **Multi-domain support** - Changes may need to work across multiple domains
3. **Email parsing is complex** - MIME parsing lives in `utils/mime.ts`, handle with care
4. **Database schema changes** require updating `schema.sql` and potentially migration scripts
5. **Type safety** - Both UI and Worker use TypeScript with strict mode enabled
6. **Testing** - Add tests for new features; run existing tests before committing
7. **Environment variables** - Never commit secrets; use `.env.example` for templates

## Troubleshooting Common Issues

| Issue | Solution |
|-------|----------|
| "API not responding" | Check Worker Route is configured in Cloudflare Dashboard |
| "No emails found" | Verify Email Routing catch-all rule points to correct Worker |
| "Database table not found" | Run `npx wrangler d1 execute [db] --remote --file=schema.sql` |
| CORS errors | Check Worker CORS headers in `utils/http.ts` |

---

*Last updated: This AGENTS.md was generated to help AI agents understand the Akunlama codebase. For more details, see the `docs/` directory.*
