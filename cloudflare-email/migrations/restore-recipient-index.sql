-- Restore idx_emails_recipient dropped in drop-redundant-indexes.sql.
-- The compound idx_emails_recipient_time alone is insufficient when
-- queries use IN() with multiple candidate values, causing full table scans.
CREATE INDEX IF NOT EXISTS idx_emails_recipient ON emails(recipient);

-- Ensure the ordered inbox lookup index exists on databases that may have
-- missed an earlier schema apply.
CREATE INDEX IF NOT EXISTS idx_emails_recipient_time ON emails(recipient, received_at DESC);
