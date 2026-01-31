-- emergency-cleanup.sql - Reclaim space by recreating the table
-- Run with: npx wrangler d1 execute akunlama --file=./emergency-cleanup.sql --remote

-- 1. Create new table matching schema
CREATE TABLE emails_new (
    id TEXT PRIMARY KEY,
    recipient TEXT NOT NULL,
    sender TEXT NOT NULL,
    subject TEXT,
    body_html TEXT,
    body_text TEXT,
    received_at INTEGER NOT NULL
);

-- 2. Copy ONLY recent emails (last 24 hours) to new table to ensure speed
-- timestamp in ms. 1 day = 86400000 ms.
INSERT INTO emails_new (id, recipient, sender, subject, body_html, body_text, received_at)
SELECT id, recipient, sender, subject, body_html, body_text, received_at
FROM emails
WHERE received_at > (strftime('%s', 'now') * 1000 - 86400000);

-- 3. Drop the bloated old table
DROP TABLE emails;

-- 4. Rename new table to take its place
ALTER TABLE emails_new RENAME TO emails;

-- 5. Re-create indexes
CREATE INDEX idx_emails_recipient ON emails(recipient);
CREATE INDEX idx_emails_received_at ON emails(received_at);
CREATE INDEX idx_emails_recipient_time ON emails(recipient, received_at DESC);

-- 6. Verify result
SELECT 'Cleanup complete. Rows remaining:' as status, count(*) as count FROM emails;
