// Ultra-simplified backend routes for unified users table approach
// Updated with password encryption and JWT authentication
// Updated to work with proper schema: users table as main, patients/doctors as supplementary

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { hashPassword, comparePassword, generateToken, authenticateToken, authenticateRole, optionalAuth } from '../middleware/auth.js';
import { authHelpers } from '../utils/supabase.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Generate unique ID for users
function generateUserId(role) {
  // Generate a proper UUID v4 format
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to get center ID for center users
const getCenterIdForUser = async (user) => {
  if (user.role !== 'center') return null;

  let centerId = user.center_id;

  // If center_id is not set in user record, try to find it in centers table
  if (!centerId) {
    const { data: centerData } = await supabase
      .from('centers')
      .select('id')
      .eq('phone', user.phone)
      .single();

    if (centerData) {
      centerId = centerData.id;
      // Update user record with center_id for future use
      await supabase
        .from('users')
        .update({ center_id: centerId })
        .eq('id', user.id);
    }
  }

  return centerId;
};

// ========================================
// PUBLIC ROUTES (No Authorization Required)
// ========================================

// Get appointment availability (booked times) for reschedule modal - PUBLIC
router.get('/appointments/availability', async (req, res) => {
  try {
    const { doctor_id, date } = req.query;

    if (!doctor_id || !date) {
      return res.status(400).json({ error: 'doctor_id and date parameters required' });
    }

    console.log('🔍 Checking availability for doctor:', doctor_id, 'on date:', date);

    // Get all booked appointments for this doctor on this date (excluding cancelled)
    const { data: bookedAppointments, error } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    if (error) {
      console.error('Error fetching booked appointments:', error);
      return res.status(500).json({ error: 'Failed to fetch availability' });
    }

    const bookedTimes = bookedAppointments?.map(apt => apt.appointment_time) || [];

    console.log('📅 Found booked times:', bookedTimes);

    res.json({
      success: true,
      date,
      doctor_id,
      bookedTimes
    });

  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// USER ROUTES (No Authorization)
// ========================================

// Create new user (patient or doctor) - Works with unified users table + supplementary tables
router.post('/register', async (req, res) => {
  try {
    console.log('=== REGISTRATION REQUEST DEBUG ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);

    const {
      phone, password, role, first_name, last_name, email, gender, date_of_birth,
      // Patient fields
      medical_history, allergies, medications,
      // Doctor fields  
      specialty, qualifications, bio, experience_years, consultation_fee, work_hours,
      // Center fields
      center_address, center_type, offers_labs, offers_imaging
    } = req.body;

    // Validate required fields
    console.log('Field validation:');
    console.log('- phone:', phone, '(type:', typeof phone, ')');
    console.log('- password:', password ? '[PROVIDED]' : '[MISSING]', '(type:', typeof password, ')');
    console.log('- role:', role, '(type:', typeof role, ')');
    console.log('- first_name:', first_name, '(type:', typeof first_name, ')');
    console.log('- last_name:', last_name, '(type:', typeof last_name, ')');

    if (!phone || !password || !role || !first_name || !last_name) {
      const missingFields = [];
      if (!phone) missingFields.push('phone');
      if (!password) missingFields.push('password');
      if (!role) missingFields.push('role');
      if (!first_name) missingFields.push('first_name');
      if (!last_name) missingFields.push('last_name');

      console.log('Missing fields:', missingFields);
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        received: { phone, password, role, first_name, last_name }
      });
    }

    if (!['patient', 'doctor', 'center', 'admin', 'super_admin'].includes(role)) {
      return res.status(400).json({ error: 'Role must be patient, doctor, center, admin, or super_admin' });
    }

    // Check if phone already exists in users table
    console.log('Checking if phone number exists:', phone);
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('phone', phone)
      .maybeSingle(); // Use maybeSingle() instead of single() to avoid errors when no record found

    console.log('Phone check result:', { existingUser, checkError });

    if (checkError) {
      console.error('Error checking phone existence:', checkError);
      return res.status(500).json({ error: 'Database error while checking phone number' });
    }

    if (existingUser) {
      console.log('Phone number already exists:', existingUser);
      return res.status(400).json({ error: 'Phone number already registered' });
    }

    // Validate center-specific required fields
    if (role === 'center') {
      if (!center_address || !center_address.trim()) {
        return res.status(400).json({ error: 'Center address is required for medical centers' });
      }
    }

    // Hash password for storage
    const bcrypt = await import('bcrypt');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate UID
    const uid = generateUserId(role);
    const fullName = `${first_name} ${last_name}`;

    // Create user record in users table (JWT-only, no Supabase Auth)
    const userData = {
      uid: uid,
      phone,
      role,
      first_name,
      last_name,
      name: fullName,
      email: email || '',
      password_hash: hashedPassword,
      gender: gender || null,
      date_of_birth: date_of_birth || null,
      is_first_login: true,
      default_dashboard: role === 'patient' ? 'patient-dashboard' :
        role === 'doctor' ? 'doctor-dashboard' :
          role === 'center' ? 'center-dashboard' :
            role === 'admin' ? 'admin-dashboard' :
              role === 'super_admin' ? 'super-admin-dashboard' : 'patient-dashboard'
    };

    // Add role-specific fields to users table
    if (role === 'patient') {
      userData.medical_history = medical_history || null;
      userData.allergies = allergies || null;
      userData.medications = medications || null;
      userData.approval_status = 'approved'; // Patients are auto-approved
    } else if (role === 'doctor') {
      userData.specialty = specialty || 'General';
      userData.qualifications = qualifications || null;
      userData.bio = bio || '';
      userData.experience_years = experience_years || 0;
      userData.consultation_fee = consultation_fee || 0;
      userData.work_hours = work_hours || null;
      userData.rating = 0;
      userData.approval_status = 'pending'; // Doctors need approval after certificate upload
    } else {
      userData.approval_status = 'approved'; // Other roles are auto-approved
    }

    console.log('Creating user with data:', userData);
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    console.log('User creation result:', { newUser, userError });

    if (userError) {
      console.error('User creation error:', userError);
      return res.status(500).json({ error: 'Failed to create user account', details: userError.message });
    }

    // Handle center registration - create center record
    if (role === 'center') {
      const centerData = {
        name: fullName,
        address: center_address,
        phone: phone,
        email: email || '',
        center_type: center_type || 'generic',
        offers_labs: offers_labs || false,
        offers_imaging: offers_imaging || false,
        approval_status: 'approved' // Auto-approve for now
      };

      const { data: newCenter, error: centerError } = await supabase
        .from('centers')
        .insert(centerData)
        .select()
        .single();

      if (centerError) {
        console.error('Center creation error:', centerError);
        // Delete the user if center creation fails
        await supabase.from('users').delete().eq('id', newUser.id);
        return res.status(500).json({ error: 'Failed to create center record' });
      }

      // Update the user record with the center_id
      const { error: updateError } = await supabase
        .from('users')
        .update({ center_id: newCenter.id })
        .eq('id', newUser.id);

      if (updateError) {
        console.error('Failed to link user to center:', updateError);
        // Clean up both records if linking fails
        await supabase.from('centers').delete().eq('id', newCenter.id);
        await supabase.from('users').delete().eq('id', newUser.id);
        return res.status(500).json({ error: 'Failed to link user to center' });
      }

      // Update the newUser object to include center_id for the response
      newUser.center_id = newCenter.id;

      console.log('✅ Center created successfully:', newCenter.id);
    }

    // No separate tables for patients or doctors - everything is in users table
    // All user data (patients and doctors) is stored in the unified users table only
    console.log('✅ User created in unified users table - no supplementary tables needed');

    // Remove password from response and generate JWT token
    const { password_hash, ...userWithoutPassword } = newUser;
    const token = generateToken(newUser);

    res.status(201).json({
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} registered successfully`,
      success: true,
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false
    });
  }
});

// Import storage service
import { storageService, validateFile } from '../utils/storage-service.js';

// Configure multer for memory storage (files will be uploaded to Supabase)
const storage = multer.memoryStorage();

const certificateUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    try {
      // Use our validation helper
      validateFile.certificate(file);
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

// Upload doctor certificate (requires authentication)
router.post('/doctor/upload-certificate', authenticateToken, certificateUpload.single('certificate'), async (req, res) => {
  try {
    const {
      certificate_type,
      certificate_number,
      issuing_authority,
      issue_date,
      expiry_date
    } = req.body;

    // Verify user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can upload certificates' });
    }

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Certificate file is required' });
    }

    // Validate required fields
    if (!certificate_type || !issuing_authority) {
      return res.status(400).json({ error: 'Certificate type and issuing authority are required' });
    }

    // Check if doctor already has a pending or approved certificate
    const { data: existingCert } = await supabase
      .from('doctor_certificates')
      .select('id, status')
      .eq('doctor_id', req.user.id)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingCert) {
      return res.status(400).json({
        error: `You already have a ${existingCert.status} certificate. Please wait for review or contact admin.`
      });
    }

    // Upload file to Supabase Storage
    console.log('📤 Uploading certificate to Supabase Storage...');
    const uploadResult = await storageService.uploadCertificate(
      req.user.id,
      req.file.buffer,
      req.file.originalname
    );

    // Save certificate to database
    const certificateData = {
      doctor_id: req.user.id,
      certificate_type: certificate_type || 'medical_license',
      certificate_number,
      certificate_file_url: uploadResult.url,
      certificate_file_path: uploadResult.path,
      certificate_file_name: req.file.originalname,
      issuing_authority,
      issue_date: issue_date || null,
      expiry_date: expiry_date || null,
      status: 'pending'
    };

    const { data: certificate, error } = await supabase
      .from('doctor_certificates')
      .insert(certificateData)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file on database error
      try {
        await storageService.deleteFile('medical-documents', uploadResult.path);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      throw error;
    }

    console.log('✅ Doctor certificate uploaded successfully:', certificate.id);

    res.status(201).json({
      success: true,
      message: 'Certificate uploaded successfully. Please wait for admin approval.',
      data: {
        certificate_id: certificate.id,
        status: certificate.status,
        submitted_at: certificate.submitted_at,
        file_url: uploadResult.url
      }
    });

  } catch (error) {
    console.error('Certificate upload error:', error);

    res.status(500).json({
      error: error.message || 'Failed to upload certificate',
      success: false
    });
  }
});

// Skip certificate upload - mark doctor as skipped
router.post('/doctor/skip-certificate', authenticateToken, async (req, res) => {
  try {
    // Verify user is a doctor
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can skip certificate upload' });
    }

    // Update user's certificate status to 'not_uploaded'
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({
        certificate_status: 'not_uploaded',
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Doctor skipped certificate upload:', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Certificate upload skipped. You can upload later from your dashboard.',
      certificate_status: 'not_uploaded'
    });

  } catch (error) {
    console.error('Skip certificate error:', error);

    res.status(500).json({
      error: error.message || 'Failed to skip certificate upload',
      success: false
    });
  }
});

// Login with email and password - JWT Only (No Supabase Auth)
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user in database by email
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password directly (assuming bcrypt or similar)
    const bcrypt = await import('bcrypt');
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // For doctors, check certificate status
    let certificateStatus = null;
    let hasCertificate = false;
    let requiresCertificateUpload = false;

    if (user.role === 'doctor') {
      // Check if doctor has uploaded any certificates
      const { data: certificates } = await supabase
        .from('doctor_certificates')
        .select('id, status, certificate_file_url')
        .eq('doctor_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (certificates && certificates.length > 0) {
        const cert = certificates[0];
        // Check if it's a real certificate or just a placeholder from skipping
        if (cert.certificate_file_url) {
          hasCertificate = true;
          certificateStatus = cert.status;
        } else {
          // No file uploaded yet - doctor skipped during signup
          requiresCertificateUpload = true;
          certificateStatus = 'not_uploaded';
        }
      } else {
        // No certificate record at all
        requiresCertificateUpload = true;
        certificateStatus = 'not_uploaded';
      }

      // Block login if no certificate uploaded at all
      if (certificateStatus === 'not_uploaded') {
        // Generate a temporary token for certificate upload only
        const tempToken = generateToken(user);

        return res.status(403).json({
          error: 'You must upload your medical certificate before you can login.',
          requires_certificate_upload: true,
          certificate_status: 'not_uploaded',
          temp_token: tempToken
        });
      }

      // If certificate is pending or rejected, prevent login but allow if approved
      if (hasCertificate && certificateStatus !== 'approved') {
        let message = '';
        switch (certificateStatus) {
          case 'pending':
            message = 'Your certificate is pending admin approval. Please wait for verification.';
            break;
          case 'rejected':
            message = 'Your certificate has been rejected. Please upload a new certificate or contact support.';
            break;
          default:
            message = 'Your certificate is under review. Please wait for admin approval.';
        }
        return res.status(403).json({
          error: message,
          approval_status: certificateStatus,
          requires_approval: true,
          certificate_status: certificateStatus
        });
      }
    }

    // Remove sensitive fields and generate JWT token
    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(user);

    // Add certificate status to response for doctors
    const response = {
      message: 'Login successful',
      success: true,
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    };

    if (user.role === 'doctor') {
      response.certificate_status = certificateStatus;
    }

    res.json(response);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false
    });
  }
});

// Register verified user (after Supabase OTP verification)
router.post('/register-verified', async (req, res) => {
  try {
    console.log('📥 Register-verified request body:', req.body);

    const {
      first_name,
      last_name,
      name,
      email,
      password,
      role,
      phone,
      gender,
      date_of_birth,
      specialty,
      bio,
      experience_years,
      consultation_fee,
      center_address,
      center_type,
      offers_labs,
      offers_imaging,
      email_verified,
      supabase_user_id
    } = req.body;

    console.log('🆔 Extracted supabase_user_id:', supabase_user_id);

    // Validate required fields
    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Email, password, name, and role are required' });
    }

    // Check if user already exists by email or by Supabase user ID
    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUserByEmail) {
      console.log('User already exists by email, returning existing user');
      // Generate JWT token for existing user
      const token = generateToken(existingUserByEmail);
      const { password_hash: _, ...userResponse } = existingUserByEmail;

      return res.status(200).json({
        message: 'User already exists',
        success: true,
        user: userResponse,
        token,
        expiresIn: '24h'
      });
    }

    // Also check by Supabase user ID if provided
    if (supabase_user_id) {
      const { data: existingUserById } = await supabase
        .from('users')
        .select('*')
        .eq('uid', supabase_user_id)
        .single();

      if (existingUserById) {
        console.log('User already exists by Supabase ID, updating with new signup data');

        // Update existing user with new signup information
        const updateData = {
          first_name,
          last_name,
          name,
          role, // Update role to match signup
          phone,
          gender: gender || existingUserById.gender,
          date_of_birth: date_of_birth || existingUserById.date_of_birth,
          specialty: specialty || existingUserById.specialty,
          bio: bio || existingUserById.bio,
          experience_years: experience_years || existingUserById.experience_years,
          consultation_fee: consultation_fee || existingUserById.consultation_fee,
          center_address: center_address || existingUserById.center_address,
          center_type: center_type || existingUserById.center_type,
          offers_labs: offers_labs !== undefined ? offers_labs : existingUserById.offers_labs,
          offers_imaging: offers_imaging !== undefined ? offers_imaging : existingUserById.offers_imaging,
          email_verified: email_verified || existingUserById.email_verified,
          updated_at: new Date().toISOString()
        };

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('uid', supabase_user_id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating existing user:', updateError);
          throw new Error('Failed to update user information');
        }

        // Generate JWT token for updated user
        const token = generateToken(updatedUser);
        const { password_hash: _, ...userResponse } = updatedUser;

        return res.status(200).json({
          message: 'User updated successfully',
          success: true,
          user: userResponse,
          token,
          expiresIn: '24h'
        });
      }
    }

    // Hash password
    const bcrypt = await import('bcrypt');
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Get Supabase user ID from request body (from OTP verification)
    const supabaseUserId = req.body.supabase_user_id;

    // Use Supabase user ID if available, otherwise generate a new UUID
    let userId;
    if (supabaseUserId && typeof supabaseUserId === 'string' && supabaseUserId.length > 0) {
      userId = supabaseUserId;
    } else {
      // Generate a proper UUID v4 if Supabase ID is not available
      userId = generateUserId(role);
      console.log('Generated fallback UUID:', userId);
    }

    // Prepare user data for insertion
    const userData = {
      id: userId,  // Primary key UUID
      uid: userId, // Use same UUID for uid field
      first_name,
      last_name,
      name,
      email,
      password_hash,
      role: role.toLowerCase(),
      phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_first_login: true,
      approval_status: role === 'doctor' ? 'pending' : 'approved'
    };

    // Add optional fields based on role
    if (role === 'patient') {
      if (gender) userData.gender = gender;
      if (date_of_birth) userData.date_of_birth = date_of_birth;
    } else if (role === 'doctor') {
      if (specialty) userData.specialty = specialty;
      if (bio) userData.bio = bio;
      if (experience_years) userData.experience_years = experience_years;
      if (consultation_fee) userData.consultation_fee = consultation_fee;
    }

    // Insert user into database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (insertError) {
      console.error('User creation error:', insertError);

      // Handle duplicate key error (user already exists)
      if (insertError.code === '23505' && insertError.message.includes('users_pkey')) {
        console.log('Duplicate user detected, attempting to fetch existing user');

        // Try to fetch the existing user by email
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();

        if (existingUser) {
          console.log('Found existing user, returning with token');
          const token = generateToken(existingUser);
          const { password_hash: _, ...userResponse } = existingUser;

          return res.status(200).json({
            message: 'User already exists',
            success: true,
            user: userResponse,
            token,
            expiresIn: '24h'
          });
        }
      }

      throw new Error(insertError.message || 'Failed to create user');
    }

    // Handle center creation if role is center
    if (role === 'center') {
      try {
        const centerData = {
          id: generateUserId('center'),
          name: name,
          address: center_address || '',
          phone: phone,
          email: email,
          center_type: center_type || 'generic',
          offers_labs: offers_labs || false,
          offers_imaging: offers_imaging || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newCenter, error: centerError } = await supabase
          .from('centers')
          .insert([centerData])
          .select()
          .single();

        if (centerError) {
          console.error('Center creation error:', centerError);
          // Don't fail the user creation if center creation fails
        } else {
          // Update user with center_id
          await supabase
            .from('users')
            .update({ center_id: newCenter.id })
            .eq('id', newUser.id);
        }
      } catch (centerErr) {
        console.error('Center creation failed:', centerErr);
        // Continue with user creation even if center creation fails
      }
    }

    // Generate JWT token
    const token = generateToken(newUser);

    // Remove sensitive information
    const { password_hash: _, ...userResponse } = newUser;

    res.status(201).json({
      message: 'User registered successfully',
      success: true,
      user: userResponse,
      token,
      expiresIn: '24h'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      success: false
    });
  }
});

// Verify JWT token endpoint
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    // Fetch fresh user data from database instead of relying on token payload
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, name, first_name, last_name, email, phone, role, center_id, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    if (error || !userData) {
      console.error('Error fetching fresh user data:', error);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('✅ Token verified, returning fresh user data:', userData);

    res.json({
      message: 'Token is valid',
      user: userData
    });
  } catch (error) {
    console.error('Error in verify endpoint:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// APPOINTMENT ROUTES (No Authorization)
// ========================================

// Book appointment - Requires authentication (UPDATED FOR UNIFIED SCHEMA)
router.post('/appointments', authenticateToken, async (req, res) => {
  console.log('🎯 UNIFIED AUTH APPOINTMENT BOOKING HIT - UNIFIED SCHEMA VERSION');
  console.log('🎯 Timestamp:', new Date().toISOString());
  console.log('🎯 Request body:', JSON.stringify(req.body, null, 2));
  console.log('🎯 User:', req.user);

  try {
    const {
      patient_id, appointment_date, appointment_time,
      duration, type, notes, symptoms, appointment_type, consultation_fee, center_id
    } = req.body;

    let { doctor_id } = req.body;

    // Enhanced validation with detailed logging
    console.log('🔍 VALIDATION - Required fields check:');
    console.log('🔍 patient_id:', patient_id, '(type:', typeof patient_id, ')');
    console.log('🔍 doctor_id:', doctor_id, '(type:', typeof doctor_id, ')');
    console.log('🔍 appointment_date:', appointment_date, '(type:', typeof appointment_date, ')');
    console.log('🔍 appointment_time:', appointment_time, '(type:', typeof appointment_time, ')');
    console.log('🔍 center_id:', center_id, '(type:', typeof center_id, ')');
    console.log('🔍 consultation_fee:', consultation_fee, '(type:', typeof consultation_fee, ')');

    // Validate required fields
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      const missingFields = [];
      if (!patient_id) missingFields.push('patient_id');
      if (!doctor_id) missingFields.push('doctor_id');
      if (!appointment_date) missingFields.push('appointment_date');
      if (!appointment_time) missingFields.push('appointment_time');

      console.log('🚨 VALIDATION FAILED - Missing fields:', missingFields);
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        received: { patient_id, doctor_id, appointment_date, appointment_time }
      });
    }

    // Enhanced authorization check with detailed logging
    console.log('🔍 AUTHORIZATION - User context:');
    console.log('🔍 req.user.id:', req.user.id, '(type:', typeof req.user.id, ')');
    console.log('🔍 req.user.role:', req.user.role);
    console.log('🔍 patient_id from request:', patient_id, '(type:', typeof patient_id, ')');

    if (req.user.role === 'patient' && req.user.id !== patient_id) {
      console.log('🚨 AUTHORIZATION FAILED - Patient ID mismatch');
      console.log('🚨 Expected:', req.user.id, 'Received:', patient_id);
      return res.status(403).json({
        error: 'Patients can only book appointments for themselves',
        user_id: req.user.id,
        requested_patient_id: patient_id
      });
    }

    // Verify patient exists in users table with role 'patient'
    console.log('🔍 PATIENT LOOKUP - Searching for patient:', patient_id);
    const { data: patientUser, error: patientError } = await supabase
      .from('users')
      .select('id, first_name, last_name, name, email, role, phone')
      .eq('id', patient_id)
      .eq('role', 'patient')
      .single();

    if (patientError || !patientUser) {
      console.log('🚨 PATIENT LOOKUP FAILED:', {
        error: patientError,
        patient_id_searched: patient_id,
        found_user: patientUser
      });
      return res.status(404).json({
        error: 'Patient not found in users table',
        patient_id: patient_id,
        supabase_error: patientError?.message
      });
    }

    console.log('✅ PATIENT FOUND:', patientUser);

    // Verify doctor exists in users table with role 'doctor'
    console.log('🔍 DOCTOR LOOKUP - Searching for doctor:', doctor_id);
    const { data: doctorUser, error: doctorError } = await supabase
      .from('users')
      .select('id, first_name, last_name, name, email, role, specialty, consultation_fee, experience_years, bio, phone')
      .eq('id', doctor_id)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctorUser) {
      console.log('🚨 DOCTOR LOOKUP FAILED:', {
        error: doctorError,
        doctor_id_searched: doctor_id,
        found_user: doctorUser
      });
      return res.status(404).json({
        error: 'Doctor not found in users table',
        doctor_id: doctor_id,
        supabase_error: doctorError?.message
      });
    }

    console.log('✅ DOCTOR FOUND:', doctorUser);

    // Normalize time format to ensure consistency (HH:MM:SS)
    const normalizedTime = appointment_time.includes(':') && appointment_time.split(':').length === 2
      ? `${appointment_time}:00`
      : appointment_time;

    console.log('🔍 TIME FORMAT DEBUG - Original:', appointment_time, 'Normalized:', normalizedTime);

    // Check if time slot is already booked (using users.id directly)
    // We need to check both HH:MM and HH:MM:SS formats for existing appointments
    const { data: existingAppointments } = await supabase
      .from('appointments')
      .select('id, appointment_time')
      .eq('doctor_id', doctor_id)  // Direct users.id reference
      .eq('appointment_date', appointment_date)
      .neq('status', 'cancelled');

    // Check for time conflicts by normalizing both formats
    const conflictFound = existingAppointments?.some(apt => {
      const existingTime = apt.appointment_time;
      const normalizedExisting = existingTime.length === 8 ? existingTime.substring(0, 5) : existingTime;
      const normalizedRequested = normalizedTime.substring(0, 5);
      return normalizedExisting === normalizedRequested;
    });

    if (conflictFound) {
      return res.status(400).json({ error: 'This time slot is already booked' });
    }

    // Generate booking reference
    const bookingRef = `A${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    // DEBUG: Log the received date
    console.log('🔍 DATE DEBUG - Received appointment_date:', appointment_date);
    console.log('🔍 DATE DEBUG - Type of appointment_date:', typeof appointment_date);
    console.log('🔍 DATE DEBUG - Current timestamp:', new Date().toISOString());

    // Create appointment using users table IDs directly (unified schema)
    const finalConsultationFee = consultation_fee || doctorUser.consultation_fee || 0;

    console.log('🔍 APPOINTMENT CREATION - Final data being inserted:');
    console.log('🔍 center_id:', center_id, '(will be saved to appointment)');

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: patient_id,    // Direct users.id reference
        doctor_id: doctor_id,      // Direct users.id reference
        center_id: center_id || null,      // Center where appointment takes place - FIXED
        appointment_date,
        appointment_time: normalizedTime,  // Use normalized time format
        duration: duration || 30,
        status: 'scheduled',
        type: type || 'consultation',
        appointment_type: appointment_type || 'clinic', // "clinic" or "home"
        notes: notes || '',
        symptoms: symptoms || '',
        booking_reference: bookingRef,
        payment_status: 'pending',
        payment_method: 'cash',
        consultation_fee: finalConsultationFee
      })
      .select()
      .single();

    if (error) {
      console.error('🚨 Appointment creation error details:', {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        appointmentData: { patient_id, doctor_id, appointment_date, appointment_time: normalizedTime }
      });
      return res.status(500).json({ error: 'Failed to create appointment' });
    }

    // DEBUG: Log what was actually saved
    console.log('✅ APPOINTMENT CREATED - Saved appointment_date:', appointment.appointment_date);
    console.log('✅ APPOINTMENT CREATED - Full appointment data:', appointment);

    console.log('✅ Appointment created successfully:', appointment.id);

    // Create billing record for the appointment
    if (finalConsultationFee > 0) {
      try {
        const { data: billingRecord, error: billingError } = await supabase
          .from('billing')
          .insert({
            appointment_id: appointment.id,
            doctor_id: doctor_id,
            patient_id: patient_id,
            amount: finalConsultationFee,
            cost: finalConsultationFee // Using same value for both amount and cost
          })
          .select()
          .single();

        if (billingError) {
          console.error('⚠️ Failed to create billing record:', billingError);
          // Don't fail the whole request if billing creation fails
        } else {
          console.log('💰 Billing record created:', billingRecord.id);
        }
      } catch (billingErr) {
        console.error('⚠️ Billing creation error:', billingErr);
      }
    }

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment: {
        ...appointment,
        patient_name: patientUser.name || `${patientUser.first_name} ${patientUser.last_name}`,
        doctor_name: doctorUser.name || `${doctorUser.first_name} ${doctorUser.last_name}`
      }
    });

  } catch (error) {
    console.error('🚨 Appointment booking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// LAB/IMAGING BOOKING ROUTES
// ========================================

// Local file upload storage for lab results (PDF)
const uploadsRoot = path.join(process.cwd(), 'uploads');
const resultsFolder = path.join(uploadsRoot, 'lab-results');
try { fs.mkdirSync(resultsFolder, { recursive: true }); } catch { }
const labResultsStorage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, resultsFolder); },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.pdf';
    const name = `result_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage: labResultsStorage });

// Get lab/scan types (catalog)
router.get('/lab-tests/types', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('lab_test_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) return res.status(500).json({ error: 'Failed to fetch lab test types' });
    res.json({ success: true, types: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get centers that offer labs or imaging and optionally a specific lab test type
router.get('/lab-tests/centers', async (req, res) => {
  try {
    const { lab_test_type_id, category } = req.query;

    // base filter: centers with offers_labs/offers_imaging when category present
    let centerQuery = supabase
      .from('centers')
      .select('*')
      .order('name');

    if (category === 'lab') centerQuery = centerQuery.eq('offers_labs', true);
    if (category === 'imaging') centerQuery = centerQuery.eq('offers_imaging', true);

    const { data: centers, error: centersError } = await centerQuery;
    if (centersError) return res.status(500).json({ error: 'Failed to fetch centers' });

    // If specific type requested, filter by center_lab_services
    let filtered = centers || [];
    if (lab_test_type_id) {
      const { data: services } = await supabase
        .from('center_lab_services')
        .select('center_id')
        .eq('lab_test_type_id', lab_test_type_id)
        .eq('is_active', true);
      const allowed = new Set((services || []).map(s => s.center_id));
      filtered = filtered.filter(c => allowed.has(c.id));
    }

    res.json({ success: true, centers: filtered });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get center services (lab tests offered with fees)
router.get('/lab-tests/centers/:centerId/services', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { data, error } = await supabase
      .from('center_lab_services')
      .select('id, base_fee, lab_test_types:lab_test_type_id(id, code, name, category, default_duration, default_fee)')
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('display_order');
    if (error) return res.status(500).json({ error: 'Failed to fetch center services' });
    res.json({ success: true, services: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available dates for a center + lab type over a range (mirrors doctor schedule flow)
router.get('/lab-tests/centers/:centerId/types/:typeId/available-dates', async (req, res) => {
  try {
    const { centerId, typeId } = req.params;
    const startDate = req.query.start_date ? String(req.query.start_date) : undefined;
    const endDate = req.query.end_date ? String(req.query.end_date) : undefined;

    // Fetch schedule entries for this center/type
    const { data: schedules, error } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('is_available', true);
    if (error) return res.status(500).json({ error: 'Failed to fetch schedule' });
    if (!schedules || schedules.length === 0) return res.json({ success: true, availableDates: [] });

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(new Date().setDate(new Date().getDate() + 30));
    const availableDates = [];

    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const day = dt.getDay();
      const has = schedules.find(s => s.day_of_week === day && s.is_available && Array.isArray(s.time_slots) && s.time_slots.length > 0);
      if (has) availableDates.push(dt.toISOString().split('T')[0]);
    }

    res.json({ success: true, availableDates });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available slots for a specific date (center + lab type)
router.get('/lab-tests/centers/:centerId/types/:typeId/available-slots', async (req, res) => {
  try {
    const { centerId, typeId } = req.params;
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' });

    const dayOfWeek = new Date(String(date)).getDay();
    const { data: schedule, error } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .maybeSingle();
    if (error) return res.status(500).json({ error: 'Failed to fetch schedule' });
    if (!schedule || !Array.isArray(schedule.time_slots)) return res.json({ success: true, availableSlots: [] });

    // Fetch booked lab slots to filter out
    const { data: bookings } = await supabase
      .from('lab_bookings')
      .select('booking_time')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('booking_date', date)
      .neq('status', 'cancelled');

    const bookedTimes = new Set((bookings || []).map(b => (b.booking_time || '').toString().slice(0, 5)));
    const availableSlots = (schedule.time_slots || [])
      .map((s) => s.time)
      .filter((t) => !bookedTimes.has(String(t)));

    res.json({ success: true, availableSlots });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Book a lab/scan (patient) – mirrors appointment creation
router.post('/lab-tests/book', authenticateToken, async (req, res) => {
  try {
    const { patient_id, center_id, lab_test_type_id, booking_date, booking_time, notes, duration, fee } = req.body;

    if (!patient_id || !center_id || !lab_test_type_id || !booking_date || !booking_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (req.user.role === 'patient' && req.user.id !== patient_id) {
      return res.status(403).json({ error: 'Patients can only book for themselves' });
    }

    // Validate patient exists
    const { data: patientUser, error: patientError } = await supabase
      .from('users')
      .select('id')
      .eq('id', patient_id)
      .eq('role', 'patient')
      .single();
    if (patientError || !patientUser) return res.status(404).json({ error: 'Patient not found' });

    // Validate center service exists and is active
    const { data: service } = await supabase
      .from('center_lab_services')
      .select('id, base_fee, lab_test_type_id')
      .eq('center_id', center_id)
      .eq('lab_test_type_id', lab_test_type_id)
      .eq('is_active', true)
      .maybeSingle();
    if (!service) return res.status(400).json({ error: 'Selected test is not offered at this center' });

    // Conflict check
    const normalizedTime = booking_time.includes(':') && booking_time.split(':').length === 2 ? `${booking_time}:00` : booking_time;
    const { data: existing } = await supabase
      .from('lab_bookings')
      .select('id')
      .eq('center_id', center_id)
      .eq('lab_test_type_id', lab_test_type_id)
      .eq('booking_date', booking_date)
      .eq('booking_time', normalizedTime)
      .neq('status', 'cancelled')
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'This time slot is already booked' });

    // Determine fee
    const { data: typeRow } = await supabase
      .from('lab_test_types')
      .select('default_fee, default_duration, name')
      .eq('id', lab_test_type_id)
      .single();
    const finalFee = fee ?? service?.base_fee ?? typeRow?.default_fee ?? 0;
    const finalDuration = duration ?? typeRow?.default_duration ?? 30;

    const booking_reference = `L${Date.now().toString().slice(-8)}${Math.random().toString(36).substring(2, 4).toUpperCase()}`;

    const { data: booking, error } = await supabase
      .from('lab_bookings')
      .insert({
        patient_id,
        center_id,
        lab_test_type_id,
        booking_date,
        booking_time: normalizedTime,
        duration: finalDuration,
        status: 'scheduled',
        notes: notes || '',
        booking_reference,
        payment_status: 'pending',
        payment_method: 'cash',
        fee: finalFee
      })
      .select('*')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to create booking' });

    // Create billing record
    if (finalFee > 0) {
      await supabase
        .from('billing')
        .insert({
          patient_id,
          appointment_id: null,
          doctor_id: null,
          amount: finalFee,
          cost: finalFee,
          lab_booking_id: booking.id
        });
    }

    res.status(201).json({ success: true, booking });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a patient’s lab bookings (My Labs)
router.get('/lab-tests/bookings/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    if (req.user.role === 'patient' && req.user.id !== patientId) {
      return res.status(403).json({ error: 'Patients can only view their own lab bookings' });
    }
    const { data, error } = await supabase
      .from('lab_bookings')
      .select(`
        *,
        center:centers!inner(id, name, address),
        type:lab_test_types!inner(id, name, category)
      `)
      .eq('patient_id', patientId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to fetch lab bookings' });
    res.json({ success: true, bookings: data || [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update lab booking status (center admin)
router.put('/lab-tests/bookings/:bookingId/status', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status, notes } = req.body;
    if (!['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Optional authorization for center role: ensure user.center_id matches booking.center_id
    if (req.user.role === 'center' && req.user.center_id) {
      const { data: booking } = await supabase
        .from('lab_bookings')
        .select('center_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!booking || booking.center_id !== req.user.center_id) {
        return res.status(403).json({ error: 'Not authorized for this booking' });
      }
    }

    const { data: updated, error } = await supabase
      .from('lab_bookings')
      .update({ status, notes: notes || null, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update booking' });
    res.json({ success: true, booking: updated });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload/attach lab result PDF (center admin)
router.put('/lab-tests/bookings/:bookingId/result', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { result_file_url, result_notes } = req.body;

    if (req.user.role === 'center' && req.user.center_id) {
      const { data: booking } = await supabase
        .from('lab_bookings')
        .select('center_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!booking || booking.center_id !== req.user.center_id) {
        return res.status(403).json({ error: 'Not authorized for this booking' });
      }
    }

    const { data: updated, error } = await supabase
      .from('lab_bookings')
      .update({
        result_file_url: result_file_url || null,
        result_notes: result_notes || null,
        result_date: new Date().toISOString().split('T')[0],
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to attach result' });
    res.json({ success: true, booking: updated });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload PDF file locally and persist URL
router.post('/lab-tests/bookings/:bookingId/result/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    // Authorization for center
    if (req.user.role === 'center' && req.user.center_id) {
      const { data: booking } = await supabase
        .from('lab_bookings')
        .select('center_id')
        .eq('id', bookingId)
        .maybeSingle();
      if (!booking || booking.center_id !== req.user.center_id) {
        return res.status(403).json({ error: 'Not authorized for this booking' });
      }
    }
    const publicUrl = `/uploads/lab-results/${req.file.filename}`;
    const { data: updated, error } = await supabase
      .from('lab_bookings')
      .update({ result_file_url: publicUrl, result_date: new Date().toISOString().split('T')[0], status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to save uploaded result' });
    res.json({ success: true, booking: updated, file_url: publicUrl });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reschedule a lab booking (patient or center admin)
router.put('/lab-tests/bookings/:bookingId/reschedule', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { new_date, new_time } = req.body;
    if (!new_date || !new_time) return res.status(400).json({ error: 'new_date and new_time are required' });

    // Fetch booking to validate ownership and conflict
    const { data: booking, error: fetchErr } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, center_id, lab_test_type_id')
      .eq('id', bookingId)
      .single();
    if (fetchErr || !booking) return res.status(404).json({ error: 'Booking not found' });

    if (req.user.role === 'patient' && req.user.id !== booking.patient_id) {
      return res.status(403).json({ error: 'Not authorized to reschedule this booking' });
    }
    if (req.user.role === 'center' && req.user.center_id && req.user.center_id !== booking.center_id) {
      return res.status(403).json({ error: 'Not authorized for this booking' });
    }

    // Conflict check
    const normalizedTime = new_time.includes(':') && new_time.split(':').length === 2 ? `${new_time}:00` : new_time;
    const { data: existing } = await supabase
      .from('lab_bookings')
      .select('id')
      .eq('center_id', booking.center_id)
      .eq('lab_test_type_id', booking.lab_test_type_id)
      .eq('booking_date', new_date)
      .eq('booking_time', normalizedTime)
      .neq('status', 'cancelled')
      .maybeSingle();
    if (existing) return res.status(409).json({ error: 'This time slot is already booked' });

    const { data: updated, error } = await supabase
      .from('lab_bookings')
      .update({ booking_date: new_date, booking_time: normalizedTime, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to reschedule booking' });
    res.json({ success: true, booking: updated });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel a lab booking (patient or center admin)
router.put('/lab-tests/bookings/:bookingId/cancel', authenticateToken, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { reason } = req.body;
    const { data: booking, error: fetchErr } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, center_id')
      .eq('id', bookingId)
      .single();
    if (fetchErr || !booking) return res.status(404).json({ error: 'Booking not found' });
    if (req.user.role === 'patient' && req.user.id !== booking.patient_id) {
      return res.status(403).json({ error: 'Not authorized to cancel this booking' });
    }
    if (req.user.role === 'center' && req.user.center_id && req.user.center_id !== booking.center_id) {
      return res.status(403).json({ error: 'Not authorized for this booking' });
    }
    const { data: updated, error } = await supabase
      .from('lab_bookings')
      .update({ status: 'cancelled', notes: reason ? `Cancelled: ${reason}` : 'Cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to cancel booking' });
    res.json({ success: true, booking: updated });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Center profile (center admin)
router.get('/center/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') return res.status(403).json({ error: 'Only centers can access this endpoint' });

    const centerId = await getCenterIdForUser(req.user);
    if (!centerId) return res.status(403).json({ error: 'Center ID not found' });

    const { data, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId)
      .single();
    if (error || !data) return res.status(404).json({ error: 'Center not found' });
    res.json({ success: true, center: data });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/center/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') return res.status(403).json({ error: 'Only centers can access this endpoint' });

    const centerId = await getCenterIdForUser(req.user);
    if (!centerId) return res.status(403).json({ error: 'Center ID not found' });

    const updates = req.body || {};
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('centers')
      .update(updates)
      .eq('id', centerId)
      .select('*')
      .single();
    if (error) return res.status(500).json({ error: 'Failed to update center profile' });
    res.json({ success: true, center: data });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin profile 
router.get('/admin/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admins can access this endpoint' });
    }

    console.log('🔍 Getting admin profile for user:', req.user.id);

    const { data, error } = await supabase
      .from('users')
      .select('id, name, first_name, last_name, email, phone, role, created_at, updated_at')
      .eq('id', req.user.id)
      .single();

    console.log('📊 Profile fetch result:', { data, error });

    if (error || !data) {
      console.error('❌ Profile fetch error:', error);
      return res.status(404).json({ error: 'Admin profile not found' });
    }

    console.log('✅ Admin profile retrieved:', data);
    res.json({ success: true, admin: data });
  } catch (e) {
    console.error('Get admin profile error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/admin/profile', authenticateToken, async (req, res) => {
  try {
    console.log('🔄 Admin profile update request:', {
      userId: req.user.id,
      userRole: req.user.role,
      body: req.body
    });

    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      console.log('❌ Access denied - not admin:', req.user.role);
      return res.status(403).json({ error: 'Only admins can access this endpoint' });
    }

    const { name, email, phone } = req.body;

    // Validation
    if (!name || !email || !phone) {
      console.log('❌ Validation failed - missing fields:', { name: !!name, email: !!email, phone: !!phone });
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }

    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      console.log('❌ Validation failed - invalid email format:', email);
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const updates = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim(),
      updated_at: new Date().toISOString()
    };

    // Split name into first_name and last_name
    const nameParts = name.trim().split(' ');
    if (nameParts.length > 0) {
      updates.first_name = nameParts[0];
      updates.last_name = nameParts.slice(1).join(' ') || nameParts[0]; // If no last name, use first name
    }

    console.log('🔄 Updating user with data:', updates);
    console.log('🔄 User ID being updated:', req.user.id);

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select('id, name, first_name, last_name, email, phone, role, created_at, updated_at')
      .single();

    console.log('📊 Supabase update result:', { data, error });

    if (error) {
      console.error('❌ Supabase update error:', error);
      return res.status(500).json({ error: 'Failed to update admin profile', details: error.message });
    }

    console.log('✅ Admin profile updated successfully:', data);
    res.json({ success: true, admin: data, message: 'Admin profile updated successfully' });
  } catch (e) {
    console.error('❌ Update admin profile error:', e);
    res.status(500).json({ error: 'Internal server error', details: e.message });
  }
});

// Test endpoint to verify user data and table structure
router.get('/admin/test-user-data', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admins can access this endpoint' });
    }

    console.log('🧪 Testing user data for:', req.user.id);

    // First, let's see what columns exist in the users table
    const { data: allData, error: allError } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    console.log('🧪 Full user data:', { allData, allError });

    // Test a simple update to see if it works
    const testUpdate = {
      updated_at: new Date().toISOString()
    };

    const { data: updateData, error: updateError } = await supabase
      .from('users')
      .update(testUpdate)
      .eq('id', req.user.id)
      .select('*')
      .single();

    console.log('🧪 Test update result:', { updateData, updateError });

    res.json({
      success: true,
      fullUserData: allData,
      testUpdateResult: updateData,
      errors: { allError, updateError }
    });
  } catch (e) {
    console.error('🧪 Test endpoint error:', e);
    res.status(500).json({ error: 'Test endpoint error', details: e.message });
  }
});

// Admin change password
router.put('/admin/change-password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({ error: 'Only admins can access this endpoint' });
    }

    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    // Get current user with password to verify current password
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, password')
      .eq('id', req.user.id)
      .single();

    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password (you might need to implement password verification based on your hashing method)
    // This is a placeholder - implement actual password verification
    const bcrypt = await import('bcrypt');
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password: hashedNewPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Update admin password error:', updateError);
      return res.status(500).json({ error: 'Failed to update password' });
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (e) {
    console.error('Change admin password error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Center: today bookings
router.get('/lab-tests/center/today', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('lab_bookings')
      .select(`*, type:lab_test_types(id, name, category), patient:users!inner(id, name, phone)`)
      .eq('center_id', req.user.center_id)
      .eq('booking_date', today)
      .order('booking_time');
    if (error) return res.status(500).json({ error: 'Failed to fetch today bookings' });
    res.json({ success: true, bookings: data || [] });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Center: manage lab services
router.get('/center/lab-services', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const { data, error } = await supabase
      .from('center_lab_services')
      .select('id, base_fee, is_active, lab_test_types:lab_test_type_id(id, code, name, category, default_fee)')
      .eq('center_id', req.user.center_id)
      .order('display_order');
    if (error) return res.status(500).json({ error: 'Failed to fetch services' });
    res.json({ success: true, services: data || [] });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/center/lab-services', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const { services } = req.body || {};
    if (!Array.isArray(services)) return res.status(400).json({ error: 'services array required' });

    // Replace-all strategy for simplicity
    await supabase.from('center_lab_services').delete().eq('center_id', req.user.center_id);
    if (services.length > 0) {
      const inserts = services.map(s => ({ center_id: req.user.center_id, lab_test_type_id: s.lab_test_type_id, base_fee: s.base_fee ?? null, is_active: s.is_active ?? true }));
      const { error: insertErr } = await supabase.from('center_lab_services').insert(inserts);
      if (insertErr) return res.status(500).json({ error: 'Failed to save services' });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Center: manage lab schedules per type
router.get('/center/lab-schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const { lab_test_type_id } = req.query;
    let q = supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', req.user.center_id)
      .order('day_of_week');
    if (lab_test_type_id) q = q.eq('lab_test_type_id', lab_test_type_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: 'Failed to fetch lab schedules' });
    res.json({ success: true, schedule: data || [] });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

router.put('/center/lab-schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const { lab_test_type_id, schedule } = req.body || {};
    if (!lab_test_type_id || !Array.isArray(schedule)) return res.status(400).json({ error: 'lab_test_type_id and schedule array are required' });

    await supabase
      .from('center_lab_schedules')
      .delete()
      .eq('center_id', req.user.center_id)
      .eq('lab_test_type_id', lab_test_type_id);

    const inserts = schedule
      .filter(d => d.is_available && Array.isArray(d.slots) && d.slots.length > 0)
      .map(d => ({
        center_id: req.user.center_id,
        lab_test_type_id,
        day_of_week: d.day_of_week,
        is_available: true,
        time_slots: d.slots.map(s => ({ time: s.time, duration: s.duration ?? (d.slot_duration ?? 30) })),
        break_start: d.break_start || null,
        break_end: d.break_end || null,
        notes: d.notes || null,
        slot_duration: d.slot_duration ?? 30
      }));

    if (inserts.length > 0) {
      const { error: insertErr } = await supabase.from('center_lab_schedules').insert(inserts);
      if (insertErr) return res.status(500).json({ error: 'Failed to save lab schedule' });
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Center: get patient details + basic history
router.get('/center/patients/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const { patientId } = req.params;
    const { data: patient, error: pErr } = await supabase
      .from('users')
      .select('id, name, phone, email, gender, date_of_birth, medical_history, allergies, medications')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();
    if (pErr || !patient) return res.status(404).json({ error: 'Patient not found' });
    // Optionally include recent lab bookings at this center
    const { data: recent } = await supabase
      .from('lab_bookings')
      .select('id, booking_date, booking_time, status, type:lab_test_types(id, name, category)')
      .eq('patient_id', patientId)
      .eq('center_id', req.user.center_id)
      .order('booking_date', { ascending: false })
      .limit(10);
    res.json({ success: true, patient, recent: recent || [] });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Center: list unique patients
router.get('/center/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select('patient_id, booking_date, patient:users!inner(id, name, email, phone, gender, date_of_birth)')
      .eq('center_id', req.user.center_id)
      .order('booking_date', { ascending: false });
    if (error) return res.status(500).json({ error: 'Failed to fetch patients' });
    const map = new Map();
    for (const b of bookings || []) {
      const p = b.patient;
      if (!p) continue;
      if (!map.has(p.id)) map.set(p.id, { id: p.id, name: p.name, email: p.email, phone: p.phone, gender: p.gender, date_of_birth: p.date_of_birth, lastBooking: b.booking_date, totalBookings: 1 });
      else {
        const it = map.get(p.id);
        it.totalBookings += 1;
        if (b.booking_date > it.lastBooking) it.lastBooking = b.booking_date;
      }
    }
    res.json({ success: true, patients: Array.from(map.values()) });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Center: list bookings (paginated)
router.get('/center/bookings', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center' || !req.user.center_id) return res.status(403).json({ error: 'Only centers can access this endpoint' });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    const offset = (page - 1) * limit;
    let q = supabase
      .from('lab_bookings')
      .select('*, patient:users!inner(id, name, phone), type:lab_test_types!inner(id, name, category)', { count: 'exact' })
      .eq('center_id', req.user.center_id)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false })
      .range(offset, offset + limit - 1);
    if (status) q = q.eq('status', status);
    const { data, error, count } = await q;
    if (error) return res.status(500).json({ error: 'Failed to fetch bookings' });
    res.json({ success: true, bookings: data || [], pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Center: analytics summary
router.get('/center/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') return res.status(403).json({ error: 'Only centers can access this endpoint' });

    const centerId = await getCenterIdForUser(req.user);
    if (!centerId) return res.status(403).json({ error: 'Center ID not found' });

    const { data: all, error } = await supabase
      .from('lab_bookings')
      .select('status, fee, lab_test_type_id, type:lab_test_types(id, category)')
      .eq('center_id', centerId);
    if (error) return res.status(500).json({ error: 'Failed to fetch analytics' });
    const totals = { scheduled: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    let revenue = 0;
    const byCategory = { lab: 0, imaging: 0 };
    for (const b of all || []) {
      totals[b.status] = (totals[b.status] || 0) + 1;
      if (b.status === 'completed') revenue += Number(b.fee || 0);
      const cat = b.type?.category || 'lab';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
    }
    res.json({ success: true, analytics: { totals, revenue, byCategory, totalBookings: (all || []).length } });
  } catch (e) { res.status(500).json({ error: 'Internal server error' }); }
});

// Get appointments for a user - Requires authentication (UPDATED FOR UNIFIED SCHEMA)
router.get('/appointments/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.query; // patient or doctor

    // Authorization check: users can only view their own appointments unless they're doctors
    if (req.user.role === 'patient' && req.user.id !== userId) {
      return res.status(403).json({ error: 'Patients can only view their own appointments' });
    }

    let appointments = [];
    const userRole = role || req.user.role;

    if (userRole === 'patient') {
      // Get appointments with doctor details using correct foreign key names
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          doctor:users!fk_appointments_doctor(
            id, name, first_name, last_name, specialty, phone, email, consultation_fee
          ),
          center:centers!fk_appointments_center(
            id, name, address, phone, email
          )
        `)
        .eq('patient_id', userId)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Patient appointments fetch error:', error);
        // Fallback to simple query without joins
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', userId)
          .order('appointment_date', { ascending: true });

        if (fallbackError) {
          return res.status(500).json({ error: 'Failed to fetch appointments' });
        }
        appointments = fallbackData || [];
      } else {
        appointments = data || [];
      }
    } else if (userRole === 'doctor') {
      // Get appointments with patient details using correct foreign key names
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:users!fk_appointments_patient(
            id, name, first_name, last_name, phone, email, date_of_birth
          ),
          center:centers!fk_appointments_center(
            id, name, address, phone, email
          )
        `)
        .eq('doctor_id', userId)
        .order('appointment_date', { ascending: true });

      if (error) {
        console.error('Doctor appointments fetch error:', error);
        // Fallback to simple query without joins
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('appointments')
          .select('*')
          .eq('doctor_id', userId)
          .order('appointment_date', { ascending: true });

        if (fallbackError) {
          return res.status(500).json({ error: 'Failed to fetch appointments' });
        }
        appointments = fallbackData || [];
      } else {
        appointments = data || [];
      }
    } else {
      return res.status(400).json({ error: 'Invalid role parameter' });
    }

    // If we got appointments without user/center details (fallback), enrich them
    if (appointments.length > 0 && (!appointments[0].doctor && !appointments[0].patient || !appointments[0].center)) {
      for (let appointment of appointments) {
        // DEBUG center logging
        console.log('🔎 Appointment center debug:', {
          id: appointment.id,
          center_id: appointment.center_id
        });
        if (userRole === 'patient' && appointment.doctor_id) {
          const { data: doctor } = await supabase
            .from('users')
            .select('id, name, first_name, last_name, specialty, phone, email, consultation_fee')
            .eq('id', appointment.doctor_id)
            .eq('role', 'doctor')
            .single();
          if (doctor) appointment.doctor = doctor;
        } else if (userRole === 'doctor' && appointment.patient_id) {
          const { data: patient } = await supabase
            .from('users')
            .select('id, name, first_name, last_name, phone, email, date_of_birth')
            .eq('id', appointment.patient_id)
            .eq('role', 'patient')
            .single();
          if (patient) appointment.patient = patient;
        }
        if (appointment.center_id && !appointment.center) {
          const { data: center } = await supabase
            .from('centers')
            .select('id, name, address, phone, email')
            .eq('id', appointment.center_id)
            .single();
          if (center) appointment.center = center;
        }
      }
    }

    console.log(`✅ Found ${appointments.length} appointments for ${userRole}: ${userId}`);

    const withFlat = (appointments || []).map((a) => {
      if (a && a.center) {
        a.center_name = a.center.name;
        a.center_address = a.center.address;
      } else if (a && a.center_id) {
        console.warn('⚠️ Center join missing; have center_id only', { id: a.id, center_id: a.center_id });
      }
      return a;
    });

    res.json({
      appointments: withFlat,
      note: `Appointments for ${userRole}: ${userId}`
    });

  } catch (error) {
    console.error('Get user appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reschedule appointment - Requires authentication
router.put('/appointments/:appointmentId/reschedule', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { new_date, new_time } = req.body;

    if (!new_date || !new_time) {
      return res.status(400).json({ error: 'New date and time required' });
    }

    // Get the appointment details
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if new time slot is available
    const { data: existingAppointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', appointment.doctor_id)
      .eq('appointment_date', new_date)
      .eq('appointment_time', new_time)
      .neq('status', 'cancelled')
      .neq('id', appointmentId)
      .single();

    if (existingAppointment) {
      return res.status(400).json({ error: 'New time slot is already booked' });
    }

    // Update the appointment
    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update({
        appointment_date: new_date,
        appointment_time: new_time,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Appointment reschedule error:', error);
      return res.status(500).json({ error: 'Failed to reschedule appointment' });
    }

    res.json({
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Reschedule appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel appointment - Requires authentication
router.put('/appointments/:appointmentId/cancel', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    // First, fetch the appointment to check timing
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Check if cancellation is within 24 hours of appointment time
    if (appointment.appointment_date && appointment.appointment_time) {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if appointment is in the past
      if (hoursUntilAppointment < 0) {
        return res.status(400).json({
          error: 'Cannot cancel a past appointment',
          code: 'APPOINTMENT_IN_PAST'
        });
      }

      // Block cancellation if less than 24 hours away
      if (hoursUntilAppointment < 24) {
        return res.status(400).json({
          error: 'Cannot cancel appointment within 24 hours of the scheduled time. Please contact support for assistance.',
          code: 'CANCELLATION_TOO_LATE'
        });
      }
    }

    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) {
      console.error('Appointment cancellation error:', error);
      return res.status(500).json({ error: 'Failed to cancel appointment' });
    }

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Cancel appointment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available time slots for a doctor on a specific date with center support
router.get('/doctors/:doctorId/available-slots', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, center_id } = req.query;

    console.log(`🔍 UNIFIED-AUTH AVAILABLE SLOTS DEBUG - Doctor: ${doctorId}, Date: ${date}, Center: ${center_id}`);

    if (!date) {
      return res.status(400).json({ error: 'Date parameter required' });
    }

    // Get day of week for schedule lookup (0 = Sunday, 6 = Saturday)
    const dayOfWeek = new Date(date).getDay();

    // Get doctor's schedule for this day and center
    let scheduleQuery = supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (center_id) {
      scheduleQuery = scheduleQuery.eq('center_id', center_id);
    }

    const { data: schedules, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      console.error('Error fetching schedule:', scheduleError);
      return res.status(500).json({ error: 'Failed to fetch doctor schedule' });
    }

    if (!schedules || schedules.length === 0) {
      return res.json({
        date,
        available_slots: [],
        booked_slots: [],
        total_available: 0,
        message: 'Doctor not available on this day'
      });
    }

    const schedule = schedules[0]; // Use first matching schedule

    // Generate available slots from schedule
    const availableSlots = [];
    if (schedule.time_slots && Array.isArray(schedule.time_slots)) {
      schedule.time_slots.forEach(slot => {
        availableSlots.push(slot.time);
      });
    }

    // Get all booked appointments for this doctor on this date
    let appointmentQuery = supabase
      .from('appointments')
      .select('appointment_time, duration, center_id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .neq('status', 'cancelled');

    // DON'T FILTER BY CENTER_ID for now - we want to see ALL booked appointments
    // if (center_id) {
    //   appointmentQuery = appointmentQuery.eq('center_id', center_id);
    // }

    const { data: bookedAppointments, error } = await appointmentQuery;

    if (error) {
      console.error('Error fetching booked slots:', error);
      return res.status(500).json({ error: 'Failed to fetch available slots' });
    }

    console.log(`🔍 AVAILABLE SLOTS DEBUG - Found ${bookedAppointments?.length || 0} booked appointments for doctor ${doctorId} on ${date}:`);
    console.log(`🔍 AVAILABLE SLOTS DEBUG - Raw booked appointments:`, bookedAppointments);
    console.log(`🔍 AVAILABLE SLOTS DEBUG - Center filter applied:`, center_id ? `center_id=${center_id}` : 'no center filter');

    // Filter out booked slots - normalize time format to HH:MM for comparison
    const bookedTimes = bookedAppointments?.map(apt => {
      const timeStr = apt.appointment_time;
      // Convert HH:MM:SS to HH:MM for comparison
      const normalizedTime = timeStr.length === 8 ? timeStr.substring(0, 5) : timeStr;
      console.log(`🔍 AVAILABLE SLOTS DEBUG - Normalizing time: ${timeStr} -> ${normalizedTime}`);
      return normalizedTime;
    }) || [];

    console.log(`🔍 AVAILABLE SLOTS DEBUG - Normalized booked times for filtering:`, bookedTimes);
    console.log(`🔍 AVAILABLE SLOTS DEBUG - Available slots before filtering:`, availableSlots);

    const finalAvailableSlots = availableSlots.filter(slot => {
      const isBooked = bookedTimes.includes(slot);
      console.log(`🔍 AVAILABLE SLOTS DEBUG - Checking slot ${slot}: ${isBooked ? 'BOOKED (filtering out)' : 'AVAILABLE (keeping)'}`);
      return !isBooked;
    });

    console.log(`🔍 Available slots after filtering:`, finalAvailableSlots);

    res.json({
      date,
      center_id: center_id || null,
      available_slots: finalAvailableSlots,
      booked_slots: bookedTimes,
      total_available: finalAvailableSlots.length,
      consultation_fee: schedule.consultation_fee || 0
    });

  } catch (error) {
    console.error('Get available slots error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctors by center and specialty (for booking modal)
router.get('/centers/:centerId/doctors', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { specialty } = req.query;

    console.log(`🔍 Getting doctors for center: ${centerId}, specialty: ${specialty}`);

    let query = supabase
      .from('doctor_centers')
      .select(`
        *,
        users!inner(
          id,
          name,
          first_name,
          last_name,
          specialty,
          consultation_fee,
          rating,
          profile_picture,
          home_visits_available,
          bio
        )
      `)
      .eq('center_id', centerId);

    const { data: doctorCenters, error } = await query;

    if (error) {
      console.error('Error fetching doctors by center:', error);
      return res.status(500).json({ error: 'Failed to fetch doctors' });
    }

    // Filter by specialty if provided and format response
    let doctors = doctorCenters?.map(dc => ({
      id: dc.users.id,
      name: dc.users.name || `${dc.users.first_name} ${dc.users.last_name}`,
      specialty: dc.users.specialty,
      consultation_fee: dc.users.consultation_fee,
      rating: dc.users.rating || 4.5,
      profile_picture: dc.users.profile_picture,
      home_visits_available: dc.users.home_visits_available || false,
      bio: dc.users.bio,
      is_primary: dc.is_primary
    })) || [];

    if (specialty) {
      doctors = doctors.filter(doctor =>
        doctor.specialty && doctor.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    // Check which doctors have schedules for this center
    for (let doctor of doctors) {
      const { data: schedules } = await supabase
        .from('doctor_schedules')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('center_id', centerId)
        .eq('is_available', true)
        .limit(1);

      doctor.has_schedule = schedules && schedules.length > 0;
    }

    console.log(`✅ Found ${doctors.length} doctors for center ${centerId}`);

    res.json({
      success: true,
      center_id: centerId,
      specialty: specialty || null,
      doctors: doctors
    });

  } catch (error) {
    console.error('Get doctors by center error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all centers (for booking modal)
router.get('/centers', async (req, res) => {
  try {
    const { specialty } = req.query;

    console.log(`🔍 Getting centers, specialty filter: ${specialty}`);

    const { data: centers, error } = await supabase
      .from('centers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching centers:', error);
      return res.status(500).json({ error: 'Failed to fetch centers' });
    }

    // If specialty is provided, filter centers that have doctors with that specialty
    let filteredCenters = centers || [];

    if (specialty) {
      const centersWithSpecialty = [];

      for (let center of filteredCenters) {
        const { data: doctorCenters } = await supabase
          .from('doctor_centers')
          .select(`
            users!inner(specialty)
          `)
          .eq('center_id', center.id);

        const hasSpecialty = doctorCenters?.some(dc =>
          dc.users.specialty && dc.users.specialty.toLowerCase().includes(specialty.toLowerCase())
        );

        if (hasSpecialty) {
          centersWithSpecialty.push(center);
        }
      }

      filteredCenters = centersWithSpecialty;
    }

    console.log(`✅ Found ${filteredCenters.length} centers`);

    res.json({
      success: true,
      specialty: specialty || null,
      centers: filteredCenters
    });

  } catch (error) {
    console.error('Get centers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all appointments - NO AUTH REQUIRED (simplified)
router.get('/appointments', async (req, res) => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('All appointments fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    res.json({
      appointments: appointments || [],
      note: 'Raw appointments data without joins'
    });

  } catch (error) {
    console.error('Get all appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all doctors - NO AUTH REQUIRED (works with existing schema)
router.get('/doctors', async (req, res) => {
  try {
    // Use the unified users table for doctors
    const { data: doctors, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, name, email, specialty, consultation_fee, experience_years, bio, rating')
      .eq('role', 'doctor')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Doctors fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch doctors' });
    }

    // Format the response to match expected structure
    const formattedDoctors = doctors?.map(doctor => ({
      id: doctor.id,
      name: doctor.name || `${doctor.first_name} ${doctor.last_name}`,
      email: doctor.email,
      specialty: doctor.specialty,
      consultation_fee: doctor.consultation_fee,
      experience_years: doctor.experience_years,
      bio: doctor.bio,
      rating: doctor.rating || 0,
      is_active: true // Assume all users are active
    })) || [];

    res.json({
      doctors: formattedDoctors,
      note: 'Using unified users table'
    });

  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor profile - REQUIRES AUTHENTICATION (for logged-in doctor)
router.get('/doctor/profile', authenticateToken, async (req, res) => {
  try {
    // Only doctors can access this endpoint
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { data: doctor, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .eq('role', 'doctor')
      .single();

    if (error || !doctor) {
      console.error('Doctor fetch error:', error);
      return res.status(404).json({ error: 'Doctor profile not found' });
    }

    // Remove password from response
    const { password, ...doctorWithoutPassword } = doctor;

    res.json({
      success: true,
      doctor: doctorWithoutPassword
    });

  } catch (error) {
    console.error('Get doctor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor profile - REQUIRES AUTHENTICATION (for logged-in doctor)
router.put('/doctor/profile', authenticateToken, async (req, res) => {
  try {
    // Only doctors can access this endpoint
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const {
      name,
      specialty,
      bio,
      experience_years,
      consultation_fee,
      qualifications
    } = req.body;

    // Validate consultation fee
    if (consultation_fee !== undefined && (consultation_fee < 0 || consultation_fee > 10000)) {
      return res.status(400).json({
        error: 'Consultation fee must be between $0 and $10,000'
      });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided
    if (name !== undefined) updateData.name = name;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (bio !== undefined) updateData.bio = bio;
    if (experience_years !== undefined) updateData.experience_years = experience_years;
    if (consultation_fee !== undefined) updateData.consultation_fee = consultation_fee;
    if (qualifications !== undefined) updateData.qualifications = qualifications;

    console.log('🔄 Updating doctor profile:', req.user.id, updateData);

    const { data: updatedDoctor, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .eq('role', 'doctor')
      .select()
      .single();

    if (error) {
      console.error('Doctor update error:', error);
      return res.status(500).json({ error: 'Failed to update doctor profile' });
    }

    // Remove password from response
    const { password, ...doctorWithoutPassword } = updatedDoctor;

    console.log('✅ Doctor profile updated successfully:', doctorWithoutPassword.id);

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      doctor: doctorWithoutPassword
    });

  } catch (error) {
    console.error('Update doctor profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's stats and appointments for doctor - REQUIRES AUTHENTICATION
router.get('/doctor/today-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Get today's appointments with patient details from users table
    const { data: todayAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        status,
        type,
        appointment_type,
        consultation_fee,
        symptoms,
        chief_complaint,
        patient_id,
        users!inner (name)
      `)
      .eq('doctor_id', req.user.id)
      .eq('appointment_date', today)
      .order('appointment_time', { ascending: true });

    if (appointmentsError) {
      console.error('Today appointments error:', appointmentsError);
      return res.status(500).json({ error: 'Failed to fetch today appointments' });
    }

    // Calculate stats
    const completedToday = todayAppointments?.filter(apt => apt.status === 'completed') || [];
    const totalRevenue = completedToday.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);

    // Find next appointment
    const currentTime = new Date().toTimeString().slice(0, 8);
    const nextAppointment = todayAppointments?.find(apt =>
      apt.appointment_time > currentTime && apt.status === 'scheduled'
    );

    // Format appointments for frontend
    const formattedAppointments = todayAppointments?.map(apt => ({
      id: apt.id,
      appointment_time: apt.appointment_time,
      patient_name: apt.users?.name || 'Unknown Patient',
      patient_id: apt.patient_id,
      type: apt.type,
      appointment_type: apt.appointment_type,
      status: apt.status,
      symptoms: apt.symptoms,
      chief_complaint: apt.chief_complaint,
      consultation_fee: apt.consultation_fee || 0
    })) || [];

    res.json({
      success: true,
      stats: {
        todayAppointments: todayAppointments?.length || 0,
        todayCompleted: completedToday.length,
        todayRevenue: totalRevenue,
        nextAppointment: nextAppointment ? {
          patient_name: nextAppointment.users?.name,
          time: nextAppointment.appointment_time,
          type: nextAppointment.type
        } : null
      },
      appointments: formattedAppointments
    });

  } catch (error) {
    console.error('Get today stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's patients with details - REQUIRES AUTHENTICATION
router.get('/doctor/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const limit = parseInt(req.query.limit) || 50;

    // Get patients who have appointments with this doctor
    // Join appointments with users table to get patient details
    const { data: patientAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        appointment_date,
        status,
        users!inner (
          id,
          name,
          email,
          phone,
          gender,
          date_of_birth,
          created_at
        )
      `)
      .eq('doctor_id', req.user.id)
      .order('appointment_date', { ascending: false });

    if (appointmentsError) {
      console.error('Patient appointments error:', appointmentsError);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }

    // Group by patient and get unique patients with stats
    const patientMap = new Map();

    patientAppointments?.forEach(apt => {
      const patient = apt.users;
      if (patient && !patientMap.has(patient.id)) {
        const age = patient.date_of_birth ?
          new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;

        patientMap.set(patient.id, {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          age,
          gender: patient.gender,
          created_at: patient.created_at,
          lastAppointment: apt.appointment_date,
          totalAppointments: 1
        });
      } else if (patient && patientMap.has(patient.id)) {
        const existing = patientMap.get(patient.id);
        existing.totalAppointments += 1;
        // Keep the most recent appointment date
        if (apt.appointment_date > existing.lastAppointment) {
          existing.lastAppointment = apt.appointment_date;
        }
      }
    });

    const patients = Array.from(patientMap.values()).slice(0, limit);

    res.json({
      success: true,
      patients,
      count: patients.length
    });

  } catch (error) {
    console.error('Get doctor patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive doctor analytics - REQUIRES AUTHENTICATION
router.get('/doctor/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    // Get all appointments for this doctor with patient data from users table
    const { data: allAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        appointment_type,
        consultation_fee,
        patient_id,
        users!inner (
          gender,
          date_of_birth
        )
      `)
      .eq('doctor_id', req.user.id);

    if (appointmentsError) {
      console.error('Analytics appointments error:', appointmentsError);
      return res.status(500).json({ error: 'Failed to fetch analytics data' });
    }

    // Get unique patients count
    const uniquePatients = new Set();
    allAppointments?.forEach(apt => {
      uniquePatients.add(apt.patient_id);
    });

    // Calculate this month's appointments
    const thisMonth = new Date();
    thisMonth.setDate(1);
    const thisMonthAppointments = allAppointments?.filter(apt =>
      new Date(apt.appointment_date) >= thisMonth
    ) || [];

    // Calculate completion rate
    const completedAppointments = allAppointments?.filter(apt => apt.status === 'completed') || [];
    const completionRate = allAppointments?.length > 0 ?
      Math.round((completedAppointments.length / allAppointments.length) * 100) : 0;

    // Calculate total revenue
    const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);

    // Age demographics
    const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
    const genderDistribution = { male: 0, female: 0, other: 0 };
    const appointmentTypes = { clinic: 0, home: 0 };

    allAppointments?.forEach(apt => {
      // Age grouping using date_of_birth from users table
      if (apt.users?.date_of_birth) {
        const age = new Date().getFullYear() - new Date(apt.users.date_of_birth).getFullYear();
        if (age <= 18) ageGroups['0-18']++;
        else if (age <= 35) ageGroups['19-35']++;
        else if (age <= 50) ageGroups['36-50']++;
        else if (age <= 65) ageGroups['51-65']++;
        else ageGroups['65+']++;
      }

      // Gender distribution
      if (apt.users?.gender) {
        genderDistribution[apt.users.gender.toLowerCase()] =
          (genderDistribution[apt.users.gender.toLowerCase()] || 0) + 1;
      }

      // Appointment types
      if (apt.appointment_type) {
        appointmentTypes[apt.appointment_type] =
          (appointmentTypes[apt.appointment_type] || 0) + 1;
      }
    });

    res.json({
      success: true,
      analytics: {
        totalPatients: uniquePatients.size,
        thisMonthAppointments: thisMonthAppointments.length,
        completionRate,
        avgRating: 4.5, // TODO: Calculate from reviews
        totalRevenue,
        patientDemographics: {
          ageGroups,
          genderDistribution,
          appointmentTypes
        }
      }
    });

  } catch (error) {
    console.error('Get doctor analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all patients - NO AUTH REQUIRED (using users table with role='patient')
router.get('/patients', async (req, res) => {
  try {
    // Use the users table filtered by role='patient' since patients table is dropped
    const { data: patients, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, name, email, phone, gender, medical_history, allergies, medications, date_of_birth')
      .eq('role', 'patient')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Patients fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch patients' });
    }

    res.json({
      patients: patients || [],
      note: 'Using unified users table with role=patient'
    });

  } catch (error) {
    console.error('Get patients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users - NO AUTH REQUIRED
router.get('/users', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Users fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch users' });
    }

    // Remove passwords from response
    const usersWithoutPasswords = users?.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }) || [];

    res.json({
      users: usersWithoutPasswords
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create medical records for a patient - Requires authentication
router.post('/medical-records', authenticateToken, async (req, res) => {
  try {
    const {
      patient_id,
      allergies,
      medications,
      medical_history,
      emergency_contact,
      medical_records
    } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Authorization check: patients can only create records for themselves
    if (req.user.role === 'patient' && req.user.id !== patient_id) {
      return res.status(403).json({ error: 'Patients can only create records for themselves' });
    }

    // Verify patient exists in users table with role 'patient'
    const { data: patientUser, error: patientError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', patient_id)
      .eq('role', 'patient')
      .single();

    if (patientError || !patientUser) {
      console.log('🚨 Patient not found:', patientError);
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Update patient's basic medical information in users table
    const updateData = {};
    if (allergies && allergies.length > 0) updateData.allergies = allergies.join(', ');
    if (medications && medications.length > 0) updateData.medications = medications.join(', ');
    if (medical_history && medical_history.length > 0) updateData.medical_history = medical_history.join(', ');

    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient_id);

      if (updateError) {
        console.error('Error updating patient medical info:', updateError);
        return res.status(500).json({ error: 'Failed to update patient medical information' });
      }
    }

    // Update emergency contact in users table (since patients table is dropped)
    if (emergency_contact && emergency_contact.name) {
      const { error: emergencyError } = await supabase
        .from('users')
        .update({
          emergency_contact: emergency_contact,
          updated_at: new Date().toISOString()
        })
        .eq('id', patient_id);

      if (emergencyError) {
        console.error('Error updating emergency contact in users table:', emergencyError);
        console.log('💡 To fix this, run the add-emergency-contact-column.sql script to add emergency_contact to users table');
      }
    }

    // Create medical records if provided
    const createdRecords = [];
    if (medical_records && medical_records.length > 0) {
      for (const record of medical_records) {
        const { data: medicalRecord, error: recordError } = await supabase
          .from('medical_records')
          .insert({
            patient_id: patient_id,
            record_type: record.record_type || 'consultation',
            title: record.title,
            description: record.description,
            diagnosis: record.diagnosis || null,
            treatment: record.treatment || null,
            prescription: record.prescription || null,
            record_date: record.record_date || new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (recordError) {
          console.error('Error creating medical record:', recordError);
          // Continue with other records even if one fails
        } else {
          createdRecords.push(medicalRecord);
        }
      }
    }

    console.log('✅ Medical records created successfully for patient:', patient_id);

    res.status(201).json({
      message: 'Medical records saved successfully',
      records_created: createdRecords.length,
      medical_records: createdRecords
    });

  } catch (error) {
    console.error('🚨 Medical records creation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's schedule with center support
router.get('/doctor/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { center_id } = req.query;

    let query = supabase
      .from('doctor_schedules')
      .select(`
        *,
        centers!inner(id, name, address)
      `)
      .eq('doctor_id', req.user.id);

    // Filter by center if specified
    if (center_id) {
      query = query.eq('center_id', center_id);
    }

    const { data: schedules, error } = await query.order('day_of_week');

    if (error) {
      console.error('Get schedule error:', error);
      return res.status(500).json({ error: 'Failed to fetch schedule' });
    }

    res.json({
      success: true,
      schedule: schedules || [],
      center_id: center_id || null
    });
  } catch (error) {
    console.error('Get doctor schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Save doctor's schedule with center support
router.put('/doctor/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { schedule, center_id } = req.body;

    if (!center_id) {
      return res.status(400).json({ error: 'Center ID is required for schedule management' });
    }

    if (!schedule || !Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Invalid schedule data' });
    }

    console.log('💾 Saving schedule for doctor:', req.user.id, 'center:', center_id);

    // Verify doctor is assigned to this center
    const { data: doctorCenter, error: centerError } = await supabase
      .from('doctor_centers')
      .select('id')
      .eq('doctor_id', req.user.id)
      .eq('center_id', center_id)
      .single();

    if (centerError || !doctorCenter) {
      return res.status(403).json({ error: 'Doctor not assigned to this center' });
    }

    // Delete existing schedules for this doctor and center
    const { error: deleteError } = await supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', req.user.id)
      .eq('center_id', center_id);

    if (deleteError) {
      console.error('Delete schedule error:', deleteError);
      return res.status(500).json({ error: 'Failed to update schedule' });
    }

    // Insert new schedules
    const schedulesToInsert = schedule.map(daySchedule => ({
      doctor_id: req.user.id,
      center_id: center_id,
      day_of_week: daySchedule.day,
      is_available: true,
      time_slots: daySchedule.slots.map(slot => ({
        time: slot.time,
        duration: slot.duration || 30
      })),
      break_start: daySchedule.break_start,
      break_end: daySchedule.break_end,
      notes: daySchedule.notes,
      consultation_fee: daySchedule.consultation_fee,
      slot_duration: daySchedule.slots[0]?.duration || 30
    }));

    if (schedulesToInsert.length > 0) {
      const { data: insertedSchedules, error: insertError } = await supabase
        .from('doctor_schedules')
        .insert(schedulesToInsert)
        .select();

      if (insertError) {
        console.error('Insert schedule error:', insertError);
        return res.status(500).json({ error: 'Failed to save schedule' });
      }

      console.log('✅ Schedule saved successfully:', insertedSchedules.length, 'days');
    }

    res.json({
      success: true,
      message: 'Schedule saved successfully',
      center_id: center_id,
      schedules_saved: schedulesToInsert.length
    });
  } catch (error) {
    console.error('Save doctor schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Medical Center Management Endpoints

// Get doctor's medical centers with enhanced data
router.get('/doctor/centers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { data: doctorCenters, error } = await supabase
      .from('doctor_centers')
      .select(`
        *,
        centers!inner(
          id,
          name,
          address,
          phone,
          email,
          operating_hours,
          services
        )
      `)
      .eq('doctor_id', req.user.id)
      .order('is_primary', { ascending: false });

    if (error) {
      console.error('Get centers error:', error);
      return res.status(500).json({ error: 'Failed to fetch medical centers' });
    }

    // Format the response to include center details
    const centers = doctorCenters?.map(dc => ({
      id: dc.centers.id,
      name: dc.centers.name,
      address: dc.centers.address,
      phone: dc.centers.phone,
      email: dc.centers.email,
      operating_hours: dc.centers.operating_hours,
      services: dc.centers.services,
      is_primary: dc.is_primary,
      doctor_center_id: dc.id
    })) || [];

    res.json({
      success: true,
      centers: centers
    });
  } catch (error) {
    console.error('Get doctor centers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new medical center
router.post('/doctor/centers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const centerData = req.body;

    if (!centerData.name || !centerData.address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // If this is being set as primary, unset other primary centers
    if (centerData.is_primary) {
      await supabase
        .from('doctor_centers')
        .update({ is_primary: false })
        .eq('doctor_id', req.user.id);
    }

    const { data: newCenter, error } = await supabase
      .from('doctor_centers')
      .insert({
        doctor_id: req.user.id,
        name: centerData.name,
        address: centerData.address,
        phone: centerData.phone,
        email: centerData.email,
        description: centerData.description,
        is_primary: centerData.is_primary || false,
        consultation_fee: centerData.consultation_fee,
        special_notes: centerData.special_notes,
        operating_hours: centerData.operating_hours || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Add center error:', error);
      return res.status(500).json({ error: 'Failed to add medical center' });
    }

    res.status(201).json({ center: newCenter });
  } catch (error) {
    console.error('Add doctor center error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update medical center
router.put('/doctor/centers/:centerId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { centerId } = req.params;
    const updates = req.body;

    // If setting as primary, unset other primary centers
    if (updates.is_primary) {
      await supabase
        .from('doctor_centers')
        .update({ is_primary: false })
        .eq('doctor_id', req.user.id)
        .neq('id', centerId);
    }

    const { data: updatedCenter, error } = await supabase
      .from('doctor_centers')
      .update(updates)
      .eq('id', centerId)
      .eq('doctor_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Update center error:', error);
      return res.status(500).json({ error: 'Failed to update medical center' });
    }

    if (!updatedCenter) {
      return res.status(404).json({ error: 'Medical center not found' });
    }

    res.json({ center: updatedCenter });
  } catch (error) {
    console.error('Update doctor center error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete medical center
router.delete('/doctor/centers/:centerId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { centerId } = req.params;

    const { error } = await supabase
      .from('doctor_centers')
      .delete()
      .eq('id', centerId)
      .eq('doctor_id', req.user.id);

    if (error) {
      console.error('Delete center error:', error);
      return res.status(500).json({ error: 'Failed to delete medical center' });
    }

    res.json({ success: true, message: 'Medical center deleted successfully' });
  } catch (error) {
    console.error('Delete doctor center error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Set primary medical center
router.post('/doctor/centers/:centerId/primary', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { centerId } = req.params;

    // Unset all primary centers for this doctor
    await supabase
      .from('doctor_centers')
      .update({ is_primary: false })
      .eq('doctor_id', req.user.id);

    // Set the selected center as primary
    const { error } = await supabase
      .from('doctor_centers')
      .update({ is_primary: true })
      .eq('id', centerId)
      .eq('doctor_id', req.user.id);

    if (error) {
      console.error('Set primary center error:', error);
      return res.status(500).json({ error: 'Failed to set primary center' });
    }

    res.json({ success: true, message: 'Primary center updated successfully' });
  } catch (error) {
    console.error('Set primary center error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all appointments for a doctor with detailed information - REQUIRES AUTHENTICATION
router.get('/doctor/appointments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const status = req.query.status; // optional filter by status
    const offset = (page - 1) * limit;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        type,
        appointment_type,
        consultation_fee,
        symptoms,
        chief_complaint,
        notes,
        patient_id,
        users!inner (
          id,
          name,
          email,
          phone,
          gender,
          date_of_birth
        ),
        created_at
      `)
      .eq('doctor_id', req.user.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {
      console.error('Doctor appointments error:', error);
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('appointments')
      .select('id', { count: 'exact' })
      .eq('doctor_id', req.user.id);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count, error: countError } = await countQuery;

    if (countError) {
      console.error('Count error:', countError);
    }

    // Format appointments
    const formattedAppointments = appointments?.map(apt => ({
      id: apt.id,
      appointment_date: apt.appointment_date,
      appointment_time: apt.appointment_time,
      status: apt.status,
      type: apt.type,
      appointment_type: apt.appointment_type,
      consultation_fee: apt.consultation_fee,
      symptoms: apt.symptoms,
      chief_complaint: apt.chief_complaint,
      notes: apt.notes,
      patient: apt.users ? {
        id: apt.users.id,
        name: apt.users.name,
        email: apt.users.email,
        phone: apt.users.phone,
        gender: apt.users.gender,
        age: apt.patient.date_of_birth ?
          new Date().getFullYear() - new Date(apt.patient.date_of_birth).getFullYear() : null
      } : null,
      created_at: apt.created_at
    })) || [];

    res.json({
      success: true,
      appointments: formattedAppointments,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment status - REQUIRES AUTHENTICATION
router.put('/doctor/appointments/:appointmentId/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    // Accept full set of valid statuses (align with DB and other routes)
    if (!status || !['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return res.status(400).json({ error: 'Valid status required (scheduled, confirmed, completed, cancelled, no_show)' });
    }

    // Update appointment
    const { data: updatedAppointment, error } = await supabase
      .from('appointments')
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('doctor_id', req.user.id)
      .select('*')
      .single();

    if (error) {
      console.error('Update appointment status error:', error);
      return res.status(500).json({ error: 'Failed to update appointment status' });
    }

    if (!updatedAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      success: true,
      message: 'Appointment status updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    console.error('Update appointment status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get upcoming appointments for today and next 7 days - REQUIRES AUTHENTICATION
router.get('/doctor/upcoming-appointments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];

    const { data: upcomingAppointments, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        type,
        appointment_type,
        symptoms,
        patient_id,
        users!inner (
          id,
          name,
          phone
        )
      `)
      .eq('doctor_id', req.user.id)
      .gte('appointment_date', today)
      .lte('appointment_date', nextWeekDate)
      .eq('status', 'scheduled')
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      console.error('Upcoming appointments error:', error);
      return res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
    }

    res.json({
      success: true,
      appointments: upcomingAppointments || []
    });

  } catch (error) {
    console.error('Get upcoming appointments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient details with appointment history - REQUIRES AUTHENTICATION
router.get('/doctor/patients/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { patientId } = req.params;

    // First verify this doctor has appointments with this patient
    const { data: hasAppointments, error: verifyError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', req.user.id)
      .limit(1);

    if (verifyError || !hasAppointments || hasAppointments.length === 0) {
      return res.status(403).json({ error: 'You can only access patients who have appointments with you' });
    }

    // Get patient details from users table
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('*')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get appointment history with this doctor only
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', req.user.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (appointmentsError) {
      console.error('Patient appointments error:', appointmentsError);
      return res.status(500).json({ error: 'Failed to fetch patient appointments' });
    }

    // Get medical records for this doctor-patient relationship only
    const { data: medicalRecords, error: recordsError } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', req.user.id)
      .order('created_at', { ascending: false });

    if (recordsError) {
      console.error('Medical records error:', recordsError);
    }

    // Calculate patient stats
    const totalAppointments = appointments?.length || 0;
    const completedAppointments = appointments?.filter(apt => apt.status === 'completed').length || 0;
    const totalSpent = appointments?.filter(apt => apt.status === 'completed')
      .reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0) || 0;

    const age = patient.date_of_birth ?
      new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;

    res.json({
      success: true,
      patient: {
        ...patient,
        age,
        stats: {
          totalAppointments,
          completedAppointments,
          totalSpent,
          lastVisit: appointments?.[0]?.appointment_date || null
        }
      },
      appointments: appointments || [],
      medicalRecords: medicalRecords || []
    });

  } catch (error) {
    console.error('Get patient details error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as unifiedAuthRoutes };
