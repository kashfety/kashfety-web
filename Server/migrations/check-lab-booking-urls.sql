-- Check lab bookings with result files to see what URLs are stored
SELECT 
    id, 
    patient_id,
    center_id,
    result_file_url,
    result_file_path,
    result_date,
    created_at
FROM lab_bookings 
WHERE result_file_url IS NOT NULL 
ORDER BY created_at DESC
LIMIT 5;

-- If you want to clear old URLs to force regeneration:
-- UPDATE lab_bookings 
-- SET result_file_url = NULL 
-- WHERE result_file_url LIKE '%/object/public/%';
