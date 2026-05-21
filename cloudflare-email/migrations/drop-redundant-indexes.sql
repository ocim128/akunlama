-- Drop indexes that no longer improve active query plans.
-- idx_emails_recipient is covered by idx_emails_recipient_time.
-- idx_emails_sender cannot accelerate the current leading-wildcard spam cleanup patterns.
DROP INDEX IF EXISTS idx_emails_recipient;
DROP INDEX IF EXISTS idx_emails_sender;
