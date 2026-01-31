-- Step 1: Delete blocked sender emails (spam)
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
