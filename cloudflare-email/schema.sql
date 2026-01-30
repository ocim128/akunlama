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
    received_at INTEGER NOT NULL
);

-- Index for fast lookups by recipient (most common query)
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);

-- Index for cleanup queries (delete old emails)
CREATE INDEX IF NOT EXISTS idx_emails_received_at ON emails(received_at);

-- Compound index for recipient + time ordering
CREATE INDEX IF NOT EXISTS idx_emails_recipient_time ON emails(recipient, received_at DESC);
