-- Row Level Security (RLS) policies for Supabase Storage buckets
-- Run these SQL commands in your Supabase dashboard > SQL Editor

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for doctor certificates bucket
-- Doctors can upload their own certificates
CREATE POLICY "Doctors can upload certificates" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-documents' 
  AND (storage.foldername(name))[1] = 'certificates'
  AND auth.uid()::text IN (
    SELECT id FROM users WHERE role = 'doctor'
  )
);

-- Admins and the doctor can view certificates
CREATE POLICY "View doctor certificates" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'medical-documents' 
  AND (storage.foldername(name))[1] = 'certificates'
  AND (
    -- Admin access
    auth.uid()::text IN (
      SELECT id FROM users WHERE role IN ('admin', 'super_admin')
    )
    OR
    -- Doctor can view their own certificate
    (storage.foldername(name))[2] = auth.uid()::text
  )
);

-- Policy for lab results bucket
-- Centers can upload lab results
CREATE POLICY "Centers can upload lab results" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'medical-documents' 
  AND (storage.foldername(name))[1] = 'lab-results'
  AND auth.uid()::text IN (
    SELECT id FROM users WHERE role = 'center'
  )
);

-- Centers, patients, and admins can view lab results
CREATE POLICY "View lab results" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'medical-documents' 
  AND (storage.foldername(name))[1] = 'lab-results'
  AND (
    -- Admin access
    auth.uid()::text IN (
      SELECT id FROM users WHERE role IN ('admin', 'super_admin')
    )
    OR
    -- Center can view their own lab results
    (storage.foldername(name))[2] = (
      SELECT center_id FROM users WHERE id = auth.uid()::text
    )::text
    OR
    -- Patient can view their own lab results
    auth.uid()::text IN (
      SELECT patient_id FROM lab_bookings 
      WHERE id = (storage.foldername(name))[3]
    )
  )
);

-- Policy for profile pictures bucket (public)
-- Anyone can view profile pictures (public bucket)
CREATE POLICY "Public profile pictures" ON storage.objects
FOR SELECT 
USING (bucket_id = 'profile-pictures');

-- Users can upload/update their own profile pictures
CREATE POLICY "Users can upload profile pictures" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can update their own profile pictures
CREATE POLICY "Users can update profile pictures" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can delete their own profile pictures
CREATE POLICY "Users can delete profile pictures" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'profile-pictures' 
  AND (storage.foldername(name))[1] = 'profiles'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Create a function to help with storage path validation
CREATE OR REPLACE FUNCTION validate_storage_path(bucket_name text, file_path text, user_role text, user_id text)
RETURNS boolean AS $$
BEGIN
  -- Validate that the storage path follows our naming conventions
  CASE bucket_name
    WHEN 'medical-documents' THEN
      IF file_path LIKE 'certificates/%' THEN
        -- Certificate path should be: certificates/{user_id}/{filename}
        RETURN (storage.foldername(file_path))[2] = user_id AND user_role = 'doctor';
      ELSIF file_path LIKE 'lab-results/%' THEN
        -- Lab result path should be: lab-results/{center_id}/{booking_id}/{filename}
        RETURN user_role = 'center';
      END IF;
    WHEN 'profile-pictures' THEN
      -- Profile picture path should be: profiles/{user_id}/{filename}
      RETURN (storage.foldername(file_path))[2] = user_id;
  END CASE;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql;

-- Note: You may need to adjust these policies based on your specific authentication setup
-- If you're using JWT tokens instead of Supabase Auth, you'll need to modify the auth.uid() references
