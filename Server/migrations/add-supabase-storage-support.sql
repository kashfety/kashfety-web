-- Update database schema to support Supabase Storage URLs
-- Run this SQL in your Supabase dashboard to add storage support

-- Add storage fields to doctor_certificates table
ALTER TABLE doctor_certificates 
ADD COLUMN IF NOT EXISTS certificate_file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);

-- Add storage fields to lab_bookings table for result files
ALTER TABLE lab_bookings 
ADD COLUMN IF NOT EXISTS result_file_path TEXT,
ADD COLUMN IF NOT EXISTS result_file_size INTEGER,
ADD COLUMN IF NOT EXISTS result_mime_type VARCHAR(100);

-- Add profile picture support to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
ADD COLUMN IF NOT EXISTS profile_picture_path TEXT;

-- Update existing certificate URLs to be nullable (for migration)
ALTER TABLE doctor_certificates 
ALTER COLUMN certificate_file_url DROP NOT NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctor_certificates_file_path ON doctor_certificates(certificate_file_path);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_result_path ON lab_bookings(result_file_path);
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture_path);

-- Add comments for documentation
COMMENT ON COLUMN doctor_certificates.certificate_file_path IS 'Supabase Storage path for the certificate file';
COMMENT ON COLUMN doctor_certificates.certificate_file_url IS 'Public/signed URL for accessing the certificate';
COMMENT ON COLUMN lab_bookings.result_file_path IS 'Supabase Storage path for the lab result file';
COMMENT ON COLUMN lab_bookings.result_file_url IS 'Public/signed URL for accessing the lab result';
COMMENT ON COLUMN users.profile_picture_path IS 'Supabase Storage path for profile picture';
COMMENT ON COLUMN users.profile_picture_url IS 'Public URL for profile picture';

-- Create a function to clean up orphaned files (optional)
CREATE OR REPLACE FUNCTION cleanup_orphaned_storage_files()
RETURNS void AS $$
BEGIN
  -- This function can be used to identify storage files that no longer have database references
  -- Implementation would depend on your cleanup policy
  RAISE NOTICE 'Storage cleanup function created. Implement cleanup logic as needed.';
END;
$$ LANGUAGE plpgsql;
