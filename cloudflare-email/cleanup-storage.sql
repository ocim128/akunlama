-- cleanup-storage.sql - Aggressive cleanup to reduce D1 storage from 5GB
-- Run with: npx wrangler d1 execute akunlama --file=./cleanup-storage.sql --remote
-- 
-- This script performs:
-- 1. Delete all blocked sender emails (spam patterns)
-- 2. Delete all emails older than 3 days
-- 3. VACUUM the database to reclaim space

-- Step 1: Delete emails from blocked senders (Facebook/Meta spam)
DELETE FROM emails WHERE 
    sender LIKE '%friendsuggestion@facebookmail.com%' OR
    sender LIKE '%reminders@facebookmail.com%' OR
    sender LIKE '%groupupdates@facebookmail.com%' OR
    sender LIKE '%pageupdates@facebookmail.com%' OR
    sender LIKE '%notification@facebookmail.com%' OR
    sender LIKE '%friendupdates@facebookmail.com%' OR
    sender LIKE '%friends@facebookmail.com%' OR
    sender LIKE '%close_friend_updates@facebookmail.com%' OR
    sender LIKE '%posts-recaps@mail.instagram.com%' OR
    sender LIKE '%registration@facebookmail.com%' OR
    sender LIKE '%registration@facebook%';

-- Step 2: Delete emails older than 3 days (259200000 milliseconds)
-- Using explicit timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000)
-- For manual execution, calculate: Current time in ms - 259200000
-- Example for Jan 30, 2026 16:00 UTC = 1769875200000 - 259200000 = 1769616000000
DELETE FROM emails WHERE received_at < (strftime('%s', 'now') * 1000 - 259200000);

-- Step 3: Show remaining email count  
SELECT COUNT(*) as remaining_emails FROM emails;

-- Step 4: Show top senders (to identify new spam patterns)
SELECT sender, COUNT(*) as count 
FROM emails 
GROUP BY sender 
ORDER BY count DESC 
LIMIT 20;

-- Note: SQLite auto-vacuums, but you can force it with:
-- VACUUM;
-- However, D1 may not support VACUUM directly. The DELETE operations should
-- automatically free up space during the next D1 internal maintenance cycle.
