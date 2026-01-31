# Configuration Reference

## UI Environment Variables (`ui/.env`)

These variables control the behavior of the frontend application.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | The URL of the backend API. | `https://akunlama.com/api` |
| `VITE_WEBSITE_DOMAIN` | The domain used for generating email addresses. | `akunlama.com` |
| `VITE_AUTO_REFRESH_INTERVAL` | Inbox polling interval in ms. | `30000` |
| `VITE_REQUEST_TIMEOUT` | Axios request timeout in ms. | `10000` |
| `VITE_MAX_EMAILS_DISPLAY` | Max items to show in the list. | `50` |
| `VITE_RETENTION_PERIOD` | Display text for how long emails are kept. | `"3 days"` |
| `VITE_ENABLE_PULL_TO_REFRESH`| Enable mobile pull-to-refresh. | `true` |
| `VITE_ENABLE_STREAMING` | Enable SSE for real-time updates. | `true` |

## Worker Configuration (`cloudflare-email/wrangler.toml`)

These variables are defined in the `[vars]` section of `wrangler.toml`.

| Variable | Description |
|----------|-------------|
| `EMAIL_DOMAIN` | The explicit domain for the email service. |
| `BANNED_USERNAMES` | Comma-separated list of prohibited usernames. |
| `BLOCKED_SENDER_KEYWORDS` | Keywords to block based on Sender address. |
| `BLOCKED_SUBJECT_KEYWORDS` | Keywords to block based on Subject line. |

## Secrets

Sensitive variables that must be set securely via `wrangler secret put`.

| Secret | Description |
|--------|-------------|
| `ADMIN_ACCESS_KEY` | Key required for accessing `recipient=*` or privileged endpoints. |
