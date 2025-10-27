-- =====================================================
-- Banner Storage Setup for Supabase
-- =====================================================
-- This script sets up the banner storage bucket and policies
-- Run this in the Supabase SQL Editor

-- Step 1: Create the banners storage bucket
-- Note: You may need to create this in the Supabase Dashboard > Storage
-- if it doesn't exist yet. The bucket should be configured as:
-- - Name: banners
-- - Public: true
-- - File size limit: 10485760 (10MB)
-- - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif

-- Step 2: Create RLS policy for public read access to banners
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
    'Public read access to banners',
    'banners',
    'true'::text
)
ON CONFLICT DO NOTHING;

-- Step 3: Create RLS policy for admin upload/delete access
INSERT INTO storage.policies (name, bucket_id, definition, command)
VALUES (
    'Admins can upload and delete banners',
    'banners',
    '(SELECT role FROM public.users WHERE id = auth.uid()) IN (''admin'', ''super_admin'')',
    'INSERT'
)
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, command)
VALUES (
    'Admins can update banners',
    'banners',
    '(SELECT role FROM public.users WHERE id = auth.uid()) IN (''admin'', ''super_admin'')',
    'UPDATE'
)
ON CONFLICT DO NOTHING;

INSERT INTO storage.policies (name, bucket_id, definition, command)
VALUES (
    'Admins can delete banners',
    'banners',
    '(SELECT role FROM public.users WHERE id = auth.uid()) IN (''admin'', ''super_admin'')',
    'DELETE'
)
ON CONFLICT DO NOTHING;

-- Step 4: Grant necessary permissions
GRANT SELECT ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT INSERT, UPDATE, DELETE ON storage.objects TO authenticated;

-- =====================================================
-- Manual Steps Required in Supabase Dashboard:
-- =====================================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create a new bucket named "banners" if it doesn't exist
-- 3. Configure bucket settings:
--    - Public bucket: ON
--    - File size limit: 10485760 (10MB)
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
-- 4. Verify the policies are active in Storage > Policies

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the policies were created:
SELECT 
    name,
    bucket_id,
    command,
    definition
FROM storage.policies
WHERE bucket_id = 'banners';
