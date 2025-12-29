import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Storage service for handling Supabase Storage operations
const storageService = {
  // Upload certificate file
  async uploadCertificate(userId, file, filename) {
    try {
      const timestamp = Date.now();
      const fileExt = filename.split('.').pop();
      const filePath = `certificates/${userId}/${timestamp}-${filename}`;

      const { data, error } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/pdf'
        });

      if (error) throw error;

      // Generate signed URL for private medical documents (24 hour expiry)
      const { data: urlData, error: urlError } = await supabase.storage
        .from('medical-documents')
        .createSignedUrl(filePath, 86400); // 24 hours

      if (urlError) {
        // Fallback to public URL if signed URL fails
        const { data: publicUrlData } = supabase.storage
          .from('medical-documents')
          .getPublicUrl(filePath);
        
        return {
          success: true,
          path: filePath,
          url: publicUrlData.publicUrl,
          data
        };
      }

      return {
        success: true,
        path: filePath,
        url: urlData.signedUrl,
        data
      };
    } catch (error) {
      throw new Error(`Failed to upload certificate: ${error.message}`);
    }
  },

  // Upload lab result file
  async uploadLabResult(bookingId, centerId, file, filename) {
    try {
      const timestamp = Date.now();
      const fileExt = filename.split('.').pop();
      const filePath = `lab-results/${centerId}/${bookingId}/${timestamp}-${filename}`;

      const { data, error } = await supabase.storage
        .from('medical-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/pdf'
        });

      if (error) throw error;

      // Get public URL for the uploaded file (no expiry)
      const { data: publicUrlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(filePath);

      return {
        success: true,
        path: filePath,
        url: publicUrlData.publicUrl,
        data
      };
    } catch (error) {
      throw new Error(`Failed to upload lab result: ${error.message}`);
    }
  },

  // Upload profile picture
  async uploadProfilePicture(userId, file, filename) {
    try {
      const timestamp = Date.now();
      const fileExt = filename.split('.').pop();
      const filePath = `profiles/${userId}/${timestamp}-profile.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true, // Allow overwrite for profile pictures
          contentType: file.type
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      return {
        success: true,
        path: filePath,
        url: urlData.publicUrl,
        data
      };
    } catch (error) {
      throw new Error(`Failed to upload profile picture: ${error.message}`);
    }
  },

  // Get signed URL for private files (certificates, lab results)
  async getSignedUrl(bucket, filePath, expiresIn = 3600) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(filePath, expiresIn);

      if (error) throw error;

      return {
        success: true,
        signedUrl: data.signedUrl,
        expiresAt: new Date(Date.now() + expiresIn * 1000)
      };
    } catch (error) {
      throw new Error(`Failed to get signed URL: ${error.message}`);
    }
  },

  // Get public URL for file (no expiry)
  async getPublicUrl(bucket, filePath) {
    try {
      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        publicUrl: data.publicUrl
      };
    } catch (error) {
      throw new Error(`Failed to get public URL: ${error.message}`);
    }
  },

  // Delete file from storage
  async deleteFile(bucket, filePath) {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  },

  // List files in a directory
  async listFiles(bucket, folder = '', limit = 100) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list(folder, {
          limit,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) throw error;

      return {
        success: true,
        files: data || []
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error.message}`);
    }
  },

  // Get file info
  async getFileInfo(bucket, filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .list('', {
          search: filePath.split('/').pop()
        });

      if (error) throw error;

      const fileInfo = data?.find(file => 
        filePath.endsWith(file.name)
      );

      return {
        success: true,
        fileInfo: fileInfo || null
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  },

  // Download file as blob
  async downloadFile(bucket, filePath) {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

      if (error) throw error;

      return {
        success: true,
        blob: data
      };
    } catch (error) {
      throw new Error(`Failed to download file: ${error.message}`);
    }
  }
};

// Helper to validate file types
export const validateFile = {
  certificate(file) {
    const allowedTypes = ['application/pdf'];
    const maxSize = 5 * 1024 * 1024; // 5MB


    const fileType = file.mimetype || file.type;
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Invalid file type: ${fileType}. Only PDF files are allowed for certificates.`);
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    return true;
  },

  labResult(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    );

    const fileType = file.mimetype || file.type;
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Invalid file type: ${fileType}. Only PDF, JPEG, and PNG files are allowed for lab results.`);
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }

    return true;
  },

  profilePicture(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 2 * 1024 * 1024; // 2MB


    const fileType = file.mimetype || file.type;
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`Invalid file type: ${fileType}. Only JPEG, PNG, and GIF files are allowed for profile pictures.`);
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 2MB.');
    }

    return true;
  }
};

export { storageService };
export default storageService;
