-- Configure storage bucket policies for proper security
-- Run this in Supabase Dashboard > SQL Editor

-- Make sure the medical-documents bucket is private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'medical-documents';

-- Make sure the profile-pictures bucket is public (for profile pictures)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'profile-pictures';

-- Verify bucket configuration
SELECT id, name, public 
FROM storage.buckets 
WHERE id IN ('medical-documents', 'profile-pictures', 'attachments');
