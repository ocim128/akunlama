-- Drop indexes that no longer improve active query plans.
-- Keep idx_emails_recipient: inbox lookups and multi-candidate recipient
-- checks need this standalone index in production.
-- idx_emails_sender cannot accelerate the current leading-wildcard spam cleanup patterns.
DROP INDEX IF EXISTS idx_emails_sender;
