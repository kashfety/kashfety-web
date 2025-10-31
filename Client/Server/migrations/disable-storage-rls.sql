-- Remove custom RLS policies for simplified storage setup
-- Run this SQL command in your Supabase dashboard > SQL Editor

-- Remove any custom RLS policies we might have created on storage.objects
-- (Supabase manages the core storage.objects table, so we can only remove our custom policies)

DROP POLICY IF EXISTS "Doctors can upload certificates" ON storage.objects;
DROP POLICY IF EXISTS "View doctor certificates" ON storage.objects;
DROP POLICY IF EXISTS "Centers can upload lab results" ON storage.objects;
DROP POLICY IF EXISTS "View lab results" ON storage.objects;
DROP POLICY IF EXISTS "Public profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete profile pictures" ON storage.objects;

-- Drop the validation function if it exists
DROP FUNCTION IF EXISTS validate_storage_path(text, text, text, text);

-- Note: Supabase Storage has default policies that allow authenticated users
-- to access files. Your application will handle additional access control
-- through your backend authentication and authorization logic.
-- 
-- If you need completely unrestricted access, you can configure bucket policies
-- in the Supabase Dashboard > Storage > [bucket] > Policies
