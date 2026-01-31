# Troubleshooting Guide

## Deployment Issues

### "Worker not found" or 404 on API
- **Cause**: The worker might not be deployed to the correct route or the custom domain is not linked.
- **Fix**: Check `wrangler.toml` for `routes` or `name`. Ensure you ran `npx wrangler deploy`. Verify Cloudflare Dashboard > Workers > your-worker > Triggers.

### "D1: Database not found"
- **Cause**: The `database_id` in `wrangler.toml` does not match the actual D1 database ID in your Cloudflare account.
- **Fix**: Run `npx wrangler d1 list` to see your DBs. Update `wrangler.toml` with the correct ID.

### CORS Errors in UI
- **Cause**: The API is rejecting requests from the UI domain.
- **Fix**: Check `src/utils/http.js` or `api.js` `createHeaders` function. Ensure the `Access-Control-Allow-Origin` header includes your UI domain (or `*` for dev).

## Runtime Issues

### Emails not appearing
- **Cause**:
  1. Email Routing rule is missing or disabled in Cloudflare Dashboard.
  2. The username is banned.
  3. The email was filtered as spam (check logs).
  4. Database write failed (check logs).
- **Fix**: Use `npx wrangler tail` to watch live logs while sending a test email.

### Rate Limit Exceeded (429)
- **Cause**: You are polling too frequently or accessing too many different inboxes from one IP.
- **Fix**: Wait a minute. In dev, you can disable rate limiting in `src/handlers/api.js` or `src/services/rate-limiter.js`.

### Slow Response
- **Cause**: Large database or complex query.
- **Fix**: Ensure `recipient` column in D1 is indexed. (Check `schema.sql`).
