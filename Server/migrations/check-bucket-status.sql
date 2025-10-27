-- Check current bucket configuration
SELECT id, name, public, created_at, updated_at 
FROM storage.buckets 
ORDER BY created_at;

-- Check if there are any existing files in the bucket
SELECT name, bucket_id, created_at 
FROM storage.objects 
WHERE bucket_id = 'medical-documents' 
ORDER BY created_at DESC 
LIMIT 5;
