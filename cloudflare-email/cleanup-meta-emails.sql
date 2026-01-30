-- Cleanup script: Delete all emails from Meta/Facebook/Instagram notification senders
-- This will free up D1 storage significantly
-- Run with: npx wrangler d1 execute email-storage --file=./cleanup-meta-emails.sql --remote

-- Delete emails from blocked senders (NOT registrations@mail.instagram.com - those are legitimate)
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
    sender LIKE '%registration@facebookmail.com%';
