# 🚀 Production-Ready File Upload Upgrade Plan

## Current Status: ❌ NOT PRODUCTION READY

### Current Issues:
- Files stored locally in `Server/uploads/`
- Single point of failure
- No scalability
- No CDN
- Security vulnerabilities

## Recommended Solution: Supabase Storage

### Benefits:
- ✅ Cloud-hosted storage
- ✅ Built-in CDN
- ✅ Row-level security
- ✅ Automatic backups
- ✅ Scalable
- ✅ Already configured in your system

### Implementation Steps:

#### 1. Create Storage Buckets
```javascript
// Run this once to set up buckets
const buckets = [
  { name: 'doctor-certificates', public: false },
  { name: 'lab-results', public: false },
  { name: 'profile-pictures', public: true }
];

for (const bucket of buckets) {
  await storageHelpers.createBucket(bucket.name, { public: bucket.public });
}
```

#### 2. Update Certificate Upload Route
Replace local multer storage with Supabase:

```javascript
// Instead of local storage:
const storage = multer.diskStorage({
  destination: 'uploads/certificates/',
  filename: (req, file, cb) => cb(null, 'cert-' + Date.now() + path.extname(file.originalname))
});

// Use memory storage + Supabase:
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload-certificate', upload.single('certificate'), async (req, res) => {
  try {
    const filePath = `certificates/${Date.now()}-${req.file.originalname}`;
    const uploadResult = await storageHelpers.uploadFile(
      'doctor-certificates', 
      filePath, 
      req.file.buffer
    );
    
    // Save file URL to database instead of local path
    await supabase.from('users').update({
      certificate_url: storageHelpers.getPublicUrl('doctor-certificates', filePath)
    }).eq('id', req.user.id);
    
    res.json({ success: true, url: uploadResult.publicUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### 3. Set Up Bucket Policies
Configure Row Level Security in Supabase dashboard:

```sql
-- Doctor certificates: Only doctors can upload, admins can view
CREATE POLICY "Doctors can upload certificates" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id = 'doctor-certificates');

CREATE POLICY "Admins can view certificates" ON storage.objects
FOR SELECT USING (bucket_id = 'doctor-certificates' AND auth.role() = 'authenticated');
```

#### 4. Environment Variables
Add to .env:
```
SUPABASE_STORAGE_URL=https://qdxoskzyastoifbmdpbe.supabase.co/storage/v1
```

#### 5. Update Database Schema
```sql
-- Add storage URLs to existing tables
ALTER TABLE users ADD COLUMN certificate_url TEXT;
ALTER TABLE lab_bookings ADD COLUMN result_file_url TEXT;
```

### Alternative Options:

#### Option 2: AWS S3
- More complex setup
- Higher costs for small apps
- Requires AWS knowledge

#### Option 3: Cloudinary
- Great for images
- Automatic optimization
- Good for profile pictures

## Migration Plan:

### Phase 1: Set up Supabase Storage (1-2 days)
1. Create buckets
2. Update upload routes
3. Test with new uploads

### Phase 2: Migrate Existing Files (1 day)
1. Upload existing files to Supabase
2. Update database URLs
3. Keep local files as backup

### Phase 3: Security & Cleanup (1 day)
1. Set up proper bucket policies
2. Remove local static serving
3. Clean up old files

## Cost Estimation:
- **Supabase Storage**: $0.021/GB + $0.09/GB transfer
- **Very affordable** for most medical apps
- First 1GB free

## Security Benefits:
- ✅ Row-level security
- ✅ Signed URLs for private files
- ✅ Automatic HTTPS
- ✅ Access logs
- ✅ Integration with your auth system

## Immediate Action Required:
**Priority: HIGH** - Current system will fail in production!
