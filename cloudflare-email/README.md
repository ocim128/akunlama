# Cloudflare Email Worker Setup

This folder contains the Cloudflare Worker for inbound email storage and API endpoints.

## Files

| File | Description |
|------|-------------|
| `unified-worker.js` | **Main worker** - Combined email + API handler with rate limiting |
| `mime-utils.js` | MIME parsing utilities for email content |
| `wrangler.toml` | Wrangler deployment configuration |
| `schema.sql` | D1 database schema initialization |
| `email-worker.js` | *(Legacy)* Standalone inbound email handler |
| `api-worker.js` | *(Legacy)* Standalone API worker |

## Quick Start

```bash
# 1. Login to Cloudflare
npx wrangler login

# 2. Create D1 database
npx wrangler d1 create akunlama-emails

# 3. Update wrangler.toml with your database_id from step 2

# 4. Initialize database schema
npx wrangler d1 execute akunlama-emails --file=./schema.sql

# 5. Set secrets
npx wrangler secret put ADMIN_ACCESS_KEY

# 6. Deploy
npx wrangler deploy

# 7. Local development
npx wrangler dev
```

## Architecture

The `unified-worker.js` combines all functionality:
- **Email handler** (`email()`) - Receives inbound emails from Cloudflare Email Routing
- **API handler** (`fetch()`) - HTTP endpoints for the frontend with rate limiting
- **Scheduled handler** (`scheduled()`) - Daily cleanup of old emails (7-day retention)

### 2. Configure D1 Database

Both workers require a D1 database binding named `DB` with the following schema:

```sql
CREATE TABLE emails (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    sender TEXT,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    received_at INTEGER NOT NULL
);

CREATE INDEX idx_emails_recipient ON emails(recipient);
CREATE INDEX idx_emails_received_at ON emails(received_at);
```

### 3. Set Admin Access Key (IMPORTANT - Security)

To prevent unauthorized access to all emails, you MUST set the `ADMIN_ACCESS_KEY` secret:

**Via Cloudflare Dashboard:**
1. Go to Workers → Your Worker → Settings → Variables
2. Add a new **Secret**: `ADMIN_ACCESS_KEY`
3. Set value to a secure random string (e.g., `openssl rand -hex 32`)

**Via Wrangler CLI:**
```bash
wrangler secret put ADMIN_ACCESS_KEY
```

### 4. Set Backend Environment Variable

In your backend deployment (Vercel, Docker, etc.), set the same key:

```env
ADMIN_ACCESS_KEY=your-secret-key-here
```

### 5. Email Filtering (Optional - Saves D1 Quota)

The email worker includes built-in filtering to block unwanted emails **before** they are stored in D1.

**Default blocked patterns (always active):**
- Meta/Facebook registration emails
- Instagram/Threads verification codes

**Configurable filtering via environment variables:**

| Variable | Description |
|----------|-------------|
| `BLOCKED_SENDER_KEYWORDS` | Comma-separated keywords to block in sender address |
| `BLOCKED_SUBJECT_KEYWORDS` | Comma-separated keywords to block in subject |
| `BLOCKED_BODY_KEYWORDS` | Comma-separated keywords to block in email body |

**Example configuration:**
```bash
# Block newsletters and marketing
BLOCKED_SENDER_KEYWORDS=noreply,newsletter,marketing,spam

# Block promotional subject lines
BLOCKED_SUBJECT_KEYWORDS=unsubscribe,promotional offer,limited time

# Block automated message content
BLOCKED_BODY_KEYWORDS=click here to unsubscribe,automated message
```

**Set via Cloudflare Dashboard:**
1. Go to Workers → Your Worker → Settings → Variables
2. Add environment variables (plain text, not secrets)

**Set via Wrangler CLI:**
```bash
wrangler secret put BLOCKED_SENDER_KEYWORDS
# Enter: noreply,newsletter,marketing
```

## API Endpoints

### GET /api/events?recipient=user@domain.com
Returns emails for a specific recipient.

### GET /api/events?recipient=*&admin_key=YOUR_SECRET
Returns ALL emails (admin access). Requires valid `admin_key`.

### GET /api/email/:id
Returns full email content by ID.

### GET /api/health
Health check endpoint.

## Security Notes

- The `*` and `all` wildcards require authentication via `admin_key`
- Never expose `ADMIN_ACCESS_KEY` in client-side code
- Admin access is only used server-to-server (backend → worker)
- Blocked emails are logged but not stored (check Cloudflare Logs)

## Auto-Delete (7-Day Retention)

Emails are automatically deleted after 7 days to save D1 storage quota.

### Setup Cron Trigger

**Via Cloudflare Dashboard:**
1. Go to Workers → Your API Worker → Triggers
2. Add a new Cron Trigger: `0 0 * * *` (runs at midnight UTC daily)

**Via Wrangler CLI (wrangler.toml):**
```toml
[triggers]
crons = ["0 0 * * *"]
```

### How It Works

- The `scheduled` handler runs daily at midnight UTC
- Deletes all emails where `received_at` is older than 7 days
- Logs the count of deleted emails to Cloudflare Logs

### Customizing Retention Period

To change the retention period, modify `EMAIL_RETENTION_MS` in `unified-worker.js`:

```javascript
// Examples:
const EMAIL_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;  // 7 days (default)
const EMAIL_RETENTION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const EMAIL_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
```

