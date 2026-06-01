-- Bring older D1 databases up to the current emails schema.
ALTER TABLE emails ADD COLUMN preview TEXT DEFAULT NULL;
ALTER TABLE emails ADD COLUMN read_at INTEGER DEFAULT NULL;

-- Ensure the recipient registry exists for inbound capture.
CREATE TABLE IF NOT EXISTS recipient_registry (
    recipient TEXT PRIMARY KEY,
    first_seen_at INTEGER NOT NULL,
    last_seen_at INTEGER NOT NULL,
    total_seen_count INTEGER NOT NULL DEFAULT 1,
    blocked_email_count INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_recipient_registry_last_seen ON recipient_registry(last_seen_at DESC);
