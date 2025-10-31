-- Clear old public URLs to force regeneration of signed URLs
-- Run this in Supabase Dashboard > SQL Editor

-- Show current URLs that need to be updated
SELECT 
    id, 
    result_file_url,
    result_file_path,
    CASE 
        WHEN result_file_url LIKE '%/object/public/%' THEN 'PUBLIC (needs update)'
        WHEN result_file_url LIKE '%/object/sign/%' THEN 'SIGNED (correct)'
        ELSE 'OTHER'
    END as url_type
FROM lab_bookings 
WHERE result_file_url IS NOT NULL;

-- Update public URLs to NULL so they get regenerated as signed URLs
UPDATE lab_bookings 
SET result_file_url = NULL 
WHERE result_file_url LIKE '%/object/public/%';

-- Verify the update
SELECT COUNT(*) as cleared_public_urls
FROM lab_bookings 
WHERE result_file_url IS NULL AND result_file_path IS NOT NULL;
