# API Documentation

The Akunlama API is built on Cloudflare Workers and provides endpoints for managing disposable emails.

Base URL (Production): `https://akunlama.com/api`

## Core Endpoints

### 1. List Events (Emails)

Fetch a list of emails for a specific recipient. This endpoint mimics the Mailgun Events API structure.

- **Endpoint**: `/events`
- **Method**: `GET`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `recipient` | string | Yes | Email address or username (e.g., `user@akunlama.com` or `user`). Use `*` for admin access (requires `admin_key`). |
| `admin_key` | string | No | Required if `recipient` is `*`. |

**Response:**

```json
{
  "items": [
    {
      "id": "uuid-string",
      "timestamp": 1700000000.000,
      "event": "stored",
      "read_at": null,
      "preview": "Hello world...",
      "message": {
        "headers": {
          "from": "sender@example.com",
          "to": "user@akunlama.com",
          "subject": "Test Email"
        }
      },
      "storage": {
        "key": "uuid-string",
        "url": "/api/email/uuid-string"
      }
    }
  ],
  "paging": { ... } // (Optional/Future)
}
```

### 2. Get Email Content

Retrieve the full content of a specific email.

- **Endpoint**: `/email/:id`
- **Method**: `GET`

**Response:**

```json
{
  "id": "uuid-string",
  "recipient": "user@akunlama.com",
  "sender": "sender@example.com",
  "subject": "Test Email",
  "html": "<html>...</html>",
  "text": "Hello world...",
  "received_at": 1700000000000
}
```

### 3. Mark Read

Mark an email as read.

- **Endpoint**: `/email/:id/read`
- **Method**: `PATCH`

**Response:**

```json
{
  "success": true,
  "read_at": 1700000000000
}
```

### 4. Real-time Stream (SSE)

Subscribe to real-time email updates for a recipient using Server-Sent Events.

- **Endpoint**: `/stream`
- **Method**: `GET`
- **Headers**: `Accept: text/event-stream`

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `recipient` | string | Yes | Username or email to listen for. |

**Events:**

- `connected`: Initial connection message.
- `heartbeat`: Keep-alive ping (every 30s).
- `email`: New email data (JSON payload similar to `/events` item).

---

## Admin Endpoints

### 1. Health Check

- **Endpoint**: `/health`
- **Method**: `GET`

**Response:** `{"status": "ok"}`

### 2. Manual Cleanup

Trigger the email cleanup process manually (delete old emails).

- **Endpoint**: `/cleanup`
- **Method**: `POST`

---

## Legacy Endpoints (Deprecated)

These endpoints exist for backward compatibility with older clients.

| Endpoint | Method | Redirects To |
|----------|--------|--------------|
| `/v1/mail/list` | GET | `/list` |
| `/v1/mail/getHtml` | GET | `/getHtml` |
| `/v1/mail/getKey` | GET | `/getKey` |

---

## Error Handling

Standard HTTP status codes are used:

- `200`: Success
- `400`: Bad Request (missing parameters, invalid format)
- `401`: Unauthorized
- `403`: Forbidden (invalid admin key)
- `404`: Not Found
- `429`: Too Many Requests (Rate limit exceeded)
- `500`: Internal Server Error
