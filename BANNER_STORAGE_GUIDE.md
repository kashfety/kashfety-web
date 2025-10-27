# Banner Storage System - Setup & Usage Guide

## Overview
The banner storage system allows administrators to upload, manage, and delete banners that will be displayed in the mobile application. Banners are stored in Supabase Storage and managed through the admin dashboard.

## Features
- ✅ Upload banners with drag-and-drop or file selection
- ✅ Preview banners before uploading
- ✅ View all uploaded banners in a grid layout
- ✅ Delete banners with confirmation
- ✅ Support for JPEG, PNG, WebP, and GIF formats
- ✅ Maximum file size: 10MB
- ✅ Public access for mobile app consumption
- ✅ Admin-only upload and delete permissions

## Setup Instructions

### 1. Create Supabase Storage Bucket

Run the setup script to create the banners bucket in Supabase:

```bash
cd Server
node setup-banner-storage.js
```

This will:
- Create a `banners` bucket in Supabase Storage
- Configure it for public read access
- Set allowed MIME types (JPEG, PNG, WebP, GIF)
- Set maximum file size to 10MB

### 2. Configure Storage Policies

After running the script, manually configure RLS policies in Supabase Dashboard:

#### Policy 1: Admin Upload/Delete Access
- **Bucket**: banners
- **Name**: "Admins can upload and delete banners"
- **Operations**: INSERT, UPDATE, DELETE
- **Target roles**: authenticated
- **Policy definition**:
  ```sql
  (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super_admin')
  ```

#### Policy 2: Public Read Access
- **Bucket**: banners
- **Name**: "Public read access to banners"
- **Operations**: SELECT
- **Target roles**: public
- **Policy definition**:
  ```sql
  true
  ```

### 3. Access the Banner Management Interface

1. Log in to the admin dashboard
2. Navigate to the "Banners" tab in the sidebar
3. You'll see two sections:
   - **Upload Banner**: Upload new banners
   - **Existing Banners**: View and manage uploaded banners

## API Endpoints

### Get All Banners
```
GET /api/admin/banners
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "banner_1234567890.jpg",
      "url": "https://supabase-url/storage/v1/object/public/banners/banner_1234567890.jpg",
      "size": 1024000,
      "created_at": "2025-10-20T10:00:00Z",
      "updated_at": "2025-10-20T10:00:00Z"
    }
  ]
}
```

### Upload Banner
```
POST /api/admin/banners/upload
Authorization: Bearer <admin_token>
Content-Type: application/json

Body:
{
  "fileName": "my-banner.jpg",
  "fileData": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "contentType": "image/jpeg"
}

Response:
{
  "success": true,
  "data": {
    "name": "banner_1234567890.jpg",
    "url": "https://supabase-url/storage/v1/object/public/banners/banner_1234567890.jpg",
    "path": "banner_1234567890.jpg"
  }
}
```

### Delete Banner
```
DELETE /api/admin/banners/:fileName
Authorization: Bearer <admin_token>

Response:
{
  "success": true,
  "message": "Banner deleted successfully"
}
```

## Usage in Admin Dashboard

### Uploading a Banner

1. Click on the upload area or drag and drop an image
2. Supported formats: PNG, JPG, WebP, GIF (max 10MB)
3. Preview the image before uploading
4. Click "Upload" to save the banner
5. The banner will appear in the grid below

### Deleting a Banner

1. Hover over a banner in the grid
2. Click the delete (trash) icon that appears
3. Confirm the deletion
4. The banner will be removed from storage

## Mobile App Integration

The uploaded banners are accessible via public URLs and can be consumed by the mobile application:

```javascript
// Example: Fetch banners in mobile app
const response = await fetch('https://your-api-url/api/admin/banners', {
  headers: {
    'Authorization': 'Bearer <token>'
  }
});

const { data: banners } = await response.json();

// Use banner URLs in image components
banners.forEach(banner => {
  console.log(banner.url); // Public URL for display
});
```

## File Naming Convention

Uploaded files are automatically renamed with a timestamp to prevent conflicts:
- Original: `my-banner.jpg`
- Stored as: `banner_1729421234567.jpg`

## Security Considerations

- ✅ Only authenticated admins can upload/delete banners
- ✅ Public read access for mobile app consumption
- ✅ File type validation (only images allowed)
- ✅ File size validation (max 10MB)
- ✅ Server-side validation and authorization

## Troubleshooting

### Issue: Cannot upload banner
**Solution**: Ensure you're logged in as an admin and the Supabase storage policies are correctly configured.

### Issue: Banners not displaying
**Solution**: Check that the banners bucket is set to public and the RLS policies allow SELECT operations.

### Issue: File too large error
**Solution**: Ensure the file is under 10MB. Compress the image if needed.

### Issue: Invalid file type
**Solution**: Only JPEG, PNG, WebP, and GIF formats are supported.

## Storage Structure

```
Supabase Storage
└── banners/
    ├── banner_1729421234567.jpg
    ├── banner_1729421234568.png
    ├── banner_1729421234569.webp
    └── banner_1729421234570.gif
```

## Future Enhancements

Potential improvements for the banner system:
- [ ] Banner ordering/priority system
- [ ] Banner scheduling (start/end dates)
- [ ] Banner click tracking/analytics
- [ ] Banner categories/tags
- [ ] Image cropping/editing tools
- [ ] Bulk upload functionality
- [ ] Banner templates

## Support

For issues or questions, contact the development team or refer to the main README.md file.
