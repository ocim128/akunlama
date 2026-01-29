# Cloudflare Email Worker Setup

This folder contains the Cloudflare Worker scripts for inbound email storage and the email API.

## Files

- `email-worker.js` - Inbound email handler (parses MIME + stores in D1)
- `api-worker.js` - API worker that reads from D1

## Setup

### 1. Deploy the Workers

Deploy `email-worker.js` (inbound) and `api-worker.js` (fetch) to Cloudflare Workers via:
- **Cloudflare Dashboard**: Workers → Create Worker → Paste code → Deploy
- **Wrangler CLI**: `wrangler deploy`

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
