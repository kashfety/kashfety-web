# Supabase Storage Bucket Configuration Guide

Since you can't modify the core `storage.objects` table directly, here's how to configure your storage buckets for simplified access:

## Option 1: Configure Bucket Policies in Supabase Dashboard

### Step 1: Go to Supabase Dashboard
1. Open your Supabase project dashboard
2. Navigate to **Storage** > **Policies**

### Step 2: Configure Each Bucket

#### For `medical-documents` bucket:
```sql
-- Allow authenticated users to SELECT files
CREATE POLICY "Authenticated users can view medical documents" ON storage.objects
FOR SELECT USING (bucket_id = 'medical-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to INSERT files  
CREATE POLICY "Authenticated users can upload medical documents" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'medical-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to UPDATE files
CREATE POLICY "Authenticated users can update medical documents" ON storage.objects
FOR UPDATE USING (bucket_id = 'medical-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to DELETE files
CREATE POLICY "Authenticated users can delete medical documents" ON storage.objects
FOR DELETE USING (bucket_id = 'medical-documents' AND auth.role() = 'authenticated');
```

#### For `profile-pictures` bucket:
```sql
-- Allow public access to profile pictures
CREATE POLICY "Public access to profile pictures" ON storage.objects
FOR SELECT USING (bucket_id = 'profile-pictures');

-- Allow authenticated users to upload profile pictures
CREATE POLICY "Authenticated users can upload profile pictures" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');

-- Allow authenticated users to update profile pictures
CREATE POLICY "Authenticated users can update profile pictures" ON storage.objects
FOR UPDATE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete profile pictures
CREATE POLICY "Authenticated users can delete profile pictures" ON storage.objects
FOR DELETE USING (bucket_id = 'profile-pictures' AND auth.role() = 'authenticated');
```

## Option 2: Use Service Role Key (Bypasses RLS)

Since you're using the Supabase service role key in your backend, RLS policies are automatically bypassed for server-side operations. Your current setup should work without any additional policies.

### Verify Your Environment Variables:
```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

The service role key has full access to storage, bypassing all RLS policies.

## Option 3: Configure Public Buckets (Simplest)

If you want the simplest setup and your security is handled in your backend:

1. Go to **Storage** in Supabase Dashboard
2. For each bucket (`medical-documents`, `profile-pictures`, `attachments`):
   - Click on the bucket
   - Go to **Settings**
   - Set **Public bucket** to `true` (if appropriate for your use case)

⚠️ **Warning**: Only make buckets public if the files should be accessible by anyone with the URL.

## Recommended Approach

**Use Option 2 (Service Role Key)** - Your current backend setup should work perfectly:

1. Your backend uses the service role key (bypasses RLS)
2. Your frontend makes requests to your backend API routes
3. Your backend handles authentication and authorization
4. Files are stored securely with controlled access through your API

No additional SQL policies needed! Just run the `disable-storage-rls.sql` script to clean up any existing policies.
