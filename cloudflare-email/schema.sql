-- schema.sql - D1 Database schema for akunlama email storage
-- Run with: npx wrangler d1 execute akunlama-emails --file=./schema.sql

-- Main emails table
CREATE TABLE IF NOT EXISTS emails (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    preview TEXT DEFAULT NULL,  -- First 100 chars of body for list view
    received_at INTEGER NOT NULL,
    read_at INTEGER DEFAULT NULL  -- NULL = unread, timestamp = when read
);

-- Index for cleanup queries (delete old emails)
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);

-- Compound index for recipient + time ordering
CREATE INDEX IF NOT EXISTS idx_emails_recipient_time ON emails(recipient, received_at DESC);

-- Persistent recipient history
-- Keeps lightweight recipient records even when emails are blocked or later deleted.
CREATE TABLE IF NOT EXISTS recipient_registry (
    recipient TEXT PRIMARY KEY,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    total_seen_count INTEGER NOT NULL DEFAULT 1,
    blocked_email_count INTEGER NOT NULL DEFAULT 0
);

-- Index for exporting recent recipient activity
CREATE INDEX IF NOT EXISTS idx_recipient_registry_last_seen ON recipient_registry(last_seen_at DESC);
