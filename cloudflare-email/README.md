# Cloudflare Email Worker

Combined email handler + API worker for disposable email service. Supports **multiple domains** from a single codebase.

## Project Structure

| File | Description |
|------|-------------|
| `src/index.ts` | Main worker entry point |
| `src/handlers/` | Email, API, and scheduled task handlers |
| `src/routes/` | API route implementations |
| `src/services/` | Business logic (Rate limiting, Cleanup, Filtering) |
| `schema.sql` | D1 database schema |
| `wrangler.[domain].toml` | Per-domain deployment config |

## Multi-Domain Architecture

This project supports deploying to **multiple domains**. Each domain gets:
- Its own **Wrangler config file** (`wrangler.[domain].toml`)
- Its own **D1 database** (isolated data)
- Its own **Worker deployment** (separate instance)
- Its own **secrets** (ADMIN_ACCESS_KEY)

### Current Domains

| Domain | Config File | Worker Name | Database |
|--------|-------------|-------------|----------|
| `akunlama.com` | `wrangler.akunlama.toml` | `akunlama-prod` | `akunlama` |
| `gratis-ongkir.com` | `wrangler.gratis-ongkir.toml` | `worker-email-gratis-ongkir` | `gratis-ongkir-emails` |

---

## Quick Start: Adding a New Domain

Follow these steps to add a third (or more) domain:

### Step 1: Create a new wrangler config

Copy an existing config and rename it:

```bash
# In cloudflare-email directory
cp wrangler.akunlama.toml wrangler.newdomain.toml
```

### Step 2: Edit the new config file

Update these fields in `wrangler.newdomain.toml`:

```toml
name = "worker-email-newdomain"              # Unique worker name
database_name = "newdomain-emails"           # New database name
database_id = "WILL_BE_REPLACED"             # Will update after creating DB

[vars]
EMAIL_DOMAIN = "newdomain.com"               # Your new domain
```

### Step 3: Create the D1 database

```bash
npx wrangler d1 create newdomain-emails
```

Copy the `database_id` from the output and paste it into your config file.

### Step 4: Initialize the database schema

```bash
npx wrangler d1 execute newdomain-emails --remote --file=schema.sql
```

### Step 5: Deploy the worker

```bash
npx wrangler deploy --config wrangler.newdomain.toml
```

### Step 6: Set the ADMIN_ACCESS_KEY secret

```bash
npx wrangler secret put ADMIN_ACCESS_KEY --config wrangler.newdomain.toml
```

### Step 7: Configure Cloudflare Dashboard

1. **Add Worker Route**: Go to your domain in Cloudflare → Workers Routes
   - Route: `newdomain.com/api/*`
   - Worker: `worker-email-newdomain`

2. **Set up Email Routing**: Go to Email → Email Routing
   - Create catch-all rule: `*@newdomain.com` → Send to Worker `worker-email-newdomain`

### Step 8: Deploy the UI

```bash
cd ../ui
npm run build
npx wrangler pages deploy dist --project-name newdomain --branch main
```

The UI automatically detects the domain and uses the correct API!

---

## Daily Operations

### Deploy a specific domain

```bash
# Deploy akunlama.com
npx wrangler deploy --config wrangler.akunlama.toml

# Deploy gratis-ongkir.com
npx wrangler deploy --config wrangler.gratis-ongkir.toml
```

### View logs for a specific domain

```bash
# Logs for akunlama.com
npx wrangler tail --config wrangler.akunlama.toml

# Logs for gratis-ongkir.com
npx wrangler tail --config wrangler.gratis-ongkir.toml
```

### Local development

```bash
# Test with akunlama config
npx wrangler dev --config wrangler.akunlama.toml
```

---

## Worker Features

### Email Handler (`email()`)
- Receives inbound emails from Cloudflare Email Routing
- Parses MIME content (multipart, quoted-printable, base64)
- Filters spam (configurable keywords) before storage
- Stores emails in D1 database

### API Handler (`fetch()`)
- `GET /api/events?recipient=user@domain.com` - List emails
- `GET /api/email/:id?recipient=...` - Get email content
- `GET /api/stream?recipient=...` - SSE for real-time updates
- `GET /api/health` - Health check
- Built-in rate limiting (75 req/min per IP)

### Scheduled Handler (`scheduled()`)
- Runs via cron trigger (every 12 hours)
- Deletes emails older than 3 days
- Cleans up spam patterns

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EMAIL_DOMAIN` | Your email domain (e.g., `akunlama.com`) |
| `ADMIN_ACCESS_KEY` | Secret key for admin access (wildcard queries) |
| `BANNED_USERNAMES` | Comma-separated banned usernames |
| `BLOCKED_SENDER_KEYWORDS` | Comma-separated sender keywords to block |
| `BLOCKED_SUBJECT_KEYWORDS` | Comma-separated subject keywords to block |

---

## Cloudflare Dashboard Setup

### Email Routing (per domain)

1. Cloudflare Dashboard → Select your domain → Email → Email Routing
2. Create catch-all rule: `*@yourdomain.com` → Send to Worker
3. Select the worker for that domain

### Worker Routes (per domain)

1. Cloudflare Dashboard → Select your domain → Workers Routes
2. Add route: `yourdomain.com/api/*` → Select worker

---

## Security

- Admin access (`recipient=*`) requires `admin_key` parameter
- Rate limiting: 75 requests/min, 10 unique usernames/min
- Input validation on usernames
- CORS headers for cross-origin access
- Each domain has isolated data (separate D1 database)

---

## Troubleshooting

### "API not responding" on new domain
- Check that Worker Route is configured (`domain.com/api/*`)
- Verify worker is deployed: `npx wrangler deployments list --config wrangler.[domain].toml`

### "No emails found" with admin key
- Check that Email Routing is configured for the domain
- Verify the catch-all rule points to the correct worker
- Check ADMIN_ACCESS_KEY is set: `npx wrangler secret list --config wrangler.[domain].toml`

### "Database table not found"
- Initialize the schema: `npx wrangler d1 execute [db-name] --remote --file=schema.sql`
