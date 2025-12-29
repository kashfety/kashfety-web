import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Create Supabase client with service role for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create Supabase client with anon key for regular operations
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database tables mapping
export const TABLES = {
  USERS: 'users',
  DOCTORS: 'doctors',
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  MEDICAL_RECORDS: 'medical_records',
  CENTERS: 'centers',
  DOCTOR_CENTERS: 'doctor_centers',
  AUDIT_LOGS: 'audit_logs'
};

// Database helper functions
export const dbHelpers = {
  // Get user by Firebase UID (for migration compatibility)
  async getUserByUid(uid) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('uid', uid)
      .single();

    // Return null if no record found, otherwise throw error
    if (error) {
      if (error.details && error.details.includes('0 rows')) {
        return null;
      }
      if (error.message && error.message.includes('multiple (or no) rows returned')) {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Get doctor by Firebase UID
  async getDoctorByUid(uid) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.DOCTORS)
      .select('*')
      .eq('uid', uid)
      .single();

    // Return null if no record found, otherwise throw error
    if (error) {
      if (error.details && error.details.includes('0 rows')) {
        return null;
      }
      if (error.message && error.message.includes('multiple (or no) rows returned')) {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Get patient by Firebase UID
  async getPatientByUid(uid) {
    const { data, error } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('*')
      .eq('uid', uid)
      .single();

    // Return null if no record found, otherwise throw error
    if (error) {
      if (error.details && error.details.includes('0 rows')) {
        return null;
      }
      if (error.message && error.message.includes('multiple (or no) rows returned')) {
        return null;
      }
      throw error;
    }
    return data;
  },

  // Create a new user (with role-specific table entry)
  async createUser(userData) {
    const { data: user, error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .insert([userData])
      .select()
      .single();

    if (userError) throw userError;

    // Create role-specific entry
    if (userData.role === 'doctor') {
      const { error: doctorError } = await supabaseAdmin
        .from(TABLES.DOCTORS)
        .insert([{
          user_id: user.id,
          uid: userData.uid,
          email: userData.email,
          name: userData.name
        }]);
      if (doctorError) throw doctorError;
    } else if (userData.role === 'patient') {
      const { error: patientError } = await supabaseAdmin
        .from(TABLES.PATIENTS)
        .insert([{
          user_id: user.id,
          uid: userData.uid,
          email: userData.email,
          name: userData.name
        }]);
      if (patientError) throw patientError;
    }

    return user;
  },

  // Log user activity
  async logActivity(userId, action, resourceType, resourceId = null, oldValues = null, newValues = null) {
    const { error } = await supabaseAdmin
      .from(TABLES.AUDIT_LOGS)
      .insert([{
        user_id: userId,
        action,
        resource_type: resourceType,
        resource_id: resourceId,
        old_values: oldValues,
        new_values: newValues
      }]);

    if (error) 
  }
};

// Export the complete auth helpers
export const authHelpers = {
  // Sign up a new user
  async signUp(email, password, { data: metadata = {} }) {
    const { data, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: metadata
    });
    if (error) throw error;

    // The admin.createUser returns { user } structure, not { data: { user } }
    return { data: { user: data.user } };
  },

  // Sign in user
  async signIn(email, password) {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get user by ID (admin only)
  async getUserById(userId) {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return data;
  },

  // Verify JWT token
  async verifyToken(token) {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    return user;
  },

  // Reset password with redirect
  async resetPassword(email) {
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password`
    });
    if (error) throw error;
  }
};

// Storage helpers
export const storageHelpers = {
  // Upload file to Supabase Storage
  async uploadFile(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options);

    if (error) throw error;
    return data;
  },

  // Get public URL for a file
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  // Delete file from storage
  async deleteFile(bucket, path) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  },

  // Create storage bucket
  async createBucket(name, options = {}) {
    const { data, error } = await supabaseAdmin.storage
      .createBucket(name, options);

    if (error) throw error;
    return data;
  }
};

// Export the main clients
export { supabase, supabaseAdmin };
export default supabase; 