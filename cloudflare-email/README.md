# Cloudflare Email Worker

Combined email handler + API worker for Akunlama disposable email service.

## Files

| File | Description |
|------|-------------|
| `src/index.js` | Main worker entry point |
| `src/handlers/` | Email, API, and scheduled task handlers |
| `src/routes/` | API route implementations |
| `src/services/` | Business logic (Rate limiting, Cleanup, Filtering) |
| `mime-utils.js` | MIME parsing utilities (shared) |
| `wrangler.toml` | Wrangler deployment configuration |
| `schema.sql` | D1 database schema |

## Quick Start

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create D1 database
npx wrangler d1 create akunlama

# 3. Update wrangler.toml with your database_id

# 4. Initialize database schema
npx wrangler d1 execute akunlama --remote --file=schema.sql

# 5. Set secrets
npx wrangler secret put ADMIN_ACCESS_KEY

# 6. Deploy
npx wrangler deploy

# 7. Local development
npx wrangler dev
```

## Worker Features

### Email Handler (`email()`)
- Receives inbound emails from Cloudflare Email Routing
- Parses MIME content (multipart, quoted-printable, base64)
- Filters spam (Meta/Facebook) before storage
- Stores emails in D1 database

### API Handler (`fetch()`)
- `GET /api/events?recipient=user@domain.com` - List emails
- `GET /api/email/:id?recipient=...` - Get email content
- `GET /api/stream?recipient=...` - SSE for real-time updates
- `GET /api/health` - Health check
- Built-in rate limiting (75 req/min per IP)

### Scheduled Handler (`scheduled()`)
- Runs via cron trigger (configured in wrangler.toml)
- Deletes emails older than 3 days
- Cleans up spam patterns

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EMAIL_DOMAIN` | Your email domain (e.g., `akunlama.com`) |
| `ADMIN_ACCESS_KEY` | Secret key for admin access (wildcard queries) |
| `BANNED_USERNAMES` | Comma-separated banned usernames |
| `BLOCKED_SENDER_KEYWORDS` | Comma-separated sender keywords to block |
| `BLOCKED_SUBJECT_KEYWORDS` | Comma-separated subject keywords to block |

## Configuration

### Email Routing

1. Cloudflare Dashboard → Email → Email Routing
2. Create catch-all rule: `*@yourdomain.com` → Send to Worker

### Cron Trigger

Already configured in `wrangler.toml`:
```toml
[triggers]
crons = ["0 3 * * *"]  # 3 AM UTC daily
```

## Security

- Admin access (`recipient=*`) requires `admin_key` parameter
- Rate limiting: 75 requests/min, 10 unique usernames/min
- Input validation on usernames
- CORS headers for cross-origin access
