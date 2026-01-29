# Email Filtering Implementation

## Overview

Email filtering to block unwanted emails based on keywords in sender, subject, or body content. This reduces server load and saves Cloudflare/Vercel quota by filtering emails **before** they reach the client.

## Features

### 1. Default Blocked Patterns (Always Active)

**Sender Patterns:**
- `registration@facebook`
- `registrations@mail.instagram.com`
- `registration@facebookmail.com`
- `groupupdates@facebookmail.com`
- `reminders@facebookmail.com`
- `friendsuggestion@facebookmail.com`
- `pageupdates@facebookmail.com`

**Subject Patterns (Regex):**
- Instagram verification codes
- Threads verification codes
- Facebook confirmation codes

### 2. Configurable Keyword Filtering (via Environment Variables)

Add these to your `.env` file:

```bash
# Block emails containing these keywords in the sender address (comma-separated, case-insensitive)
BLOCKED_SENDER_KEYWORDS=noreply,newsletter,marketing,spam

# Block emails containing these keywords in the subject (comma-separated, case-insensitive)
BLOCKED_SUBJECT_KEYWORDS=unsubscribe,verify your email,promotional offer

# Block emails containing these keywords in the body (comma-separated, case-insensitive)
BLOCKED_BODY_KEYWORDS=click here to unsubscribe,this is an automated message
```

## How It Works

1. When the server starts, it loads keywords from environment variables
2. On startup, it logs the number of loaded keywords:
   ```
   [EMAIL FILTER] Loaded 3 blocked sender keywords
   [EMAIL FILTER] Loaded 2 blocked subject keywords
   ```
3. For each email fetched from API, `shouldFilterEmail()` checks:
   - Default hardcoded sender patterns (Meta/Facebook)
   - Default hardcoded subject regex patterns (verification codes)
   - Configurable sender keywords from `BLOCKED_SENDER_KEYWORDS`
   - Configurable subject keywords from `BLOCKED_SUBJECT_KEYWORDS`
   - Configurable body keywords from `BLOCKED_BODY_KEYWORDS`
4. If any check matches, the email is filtered out and NOT sent to the client

## Benefits

- **Reduced Server Load**: Unwanted emails are never processed or transmitted
- **Quota Savings**: Less data transferred = more free quota on Cloudflare/Vercel
- **Configurable**: No code changes needed - just update `.env` file
- **Case Insensitive**: Keywords match regardless of case
- **Extensible**: Easy to add more keywords without redeployment

## Files Modified

| File | Description |
|------|-------------|
| `backend/src/shared/emailFilter.js` | Core filtering logic with configurable keywords |
| `backend/src/api/mailListCloudflare.js` | Updated imports |
| `backend/src/api/mailList.js` | Updated imports (Mailgun version) |
| `backend/.env.cloudflare.sample` | Documentation for new environment variables |
| `backend/test/emailFilter.test.js` | Unit tests for email filtering |

## API

### `shouldFilterEmail(email, logReason = false)`

Check if an email should be filtered out.

**Parameters:**
- `email` - Email object (supports both Mailgun and Cloudflare formats)
- `logReason` - If `true`, logs the reason for filtering

**Returns:** `boolean` - `true` if email should be blocked

### `getFilterStats()`

Get current filter configuration statistics.

**Returns:**
```javascript
{
    defaultSenderPatterns: 7,      // Built-in sender patterns
    defaultSubjectPatterns: 5,      // Built-in subject patterns
    configuredSenderKeywords: 3,    // From BLOCKED_SENDER_KEYWORDS
    configuredSubjectKeywords: 2,   // From BLOCKED_SUBJECT_KEYWORDS
    configuredBodyKeywords: 2,      // From BLOCKED_BODY_KEYWORDS
    totalFilters: 19                // Total active filters
}
```

### `containsBlockedKeyword(text, keywords)`

Check if text contains any of the blocked keywords.

**Parameters:**
- `text` - String to check
- `keywords` - Array of keywords

**Returns:** `string|null` - The matched keyword or `null`

## Usage Examples

### Example 1: Block Marketing Emails

```bash
BLOCKED_SENDER_KEYWORDS=marketing,promo,sales,ads
BLOCKED_SUBJECT_KEYWORDS=limited time,act now,don't miss out
```

### Example 2: Block Notification Spam

```bash
BLOCKED_SENDER_KEYWORDS=noreply,donotreply,no-reply
BLOCKED_SUBJECT_KEYWORDS=notification,alert,reminder
```

### Example 3: Block Specific Services

```bash
BLOCKED_SENDER_KEYWORDS=twitter,linkedin,tiktok
```

## Running Tests

```bash
cd backend
node test/emailFilter.test.js
```
