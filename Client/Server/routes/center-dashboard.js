// Center Dashboard API Routes
// This file contains all the endpoints needed for the center dashboard

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { storageService, validateFile } from '../utils/storage-service.js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get center profile
async function getCenterProfile(centerId) {
  const { data: center, error } = await supabase
    .from('centers')
    .select('*')
    .eq('id', centerId)
    .single();
  
  if (error) throw error;
  return center;
}

// Get today's lab tests for center - /api/center-dashboard/lab-tests/today
router.get('/lab-tests/today', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const centerId = req.user.center_id || req.user.id;
    
    // Get today's lab bookings for this center
    const today = new Date();
    const todayStr = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0,10);
    
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        id,
        patient_id,
        patients:patient_id(name, phone, email, gender, date_of_birth),
        booking_date,
        booking_time,
        status,
        fee,
        notes,
        created_at,
        test_type_id:lab_test_type_id,
        lab_test_types:lab_test_type_id (
          name,
          category
        )
      `)
      .eq('center_id', centerId)
      .gte('booking_date', todayStr)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Transform data to match expected format
    const appointments = (bookings || []).map(booking => ({
      id: booking.id,
      patient_id: booking.patient_id, // Add patient_id field
      patient_name: booking.patients?.name || 'Unknown Patient',
      patient_phone: booking.patients?.phone || '',
      patient_email: booking.patients?.email || '',
      patient_gender: booking.patients?.gender || '',
      patient_date_of_birth: booking.patients?.date_of_birth || '',
      test_type_name: booking.lab_test_types?.name || 'Unknown Test',
      test_category: booking.lab_test_types?.category || 'lab',
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: booking.status,
      fee: booking.fee || 0,
      notes: booking.notes || '',
      created_at: booking.created_at,
      // Include patients object for backward compatibility
      patients: booking.patients
    }));

    res.json({
      success: true,
      appointments
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get center profile - /api/center-dashboard/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const centerId = req.user.center_id || req.user.id;
    const center = await getCenterProfile(centerId);

    res.json({
      success: true,
      center
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update center profile - /api/center-dashboard/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const centerId = req.user.center_id || req.user.id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    const { id, created_at, updated_at, ...allowedUpdates } = updates;

    const { data: center, error } = await supabase
      .from('centers')
      .update(allowedUpdates)
      .eq('id', centerId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      center
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient details - /api/center-dashboard/patients/:patientId
router.get('/patients/:patientId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const patientId = req.params.patientId;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (patientError) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    res.json({
      success: true,
      patient
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patients list - /api/center-dashboard/patients
router.get('/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const centerId = req.user.center_id || req.user.id;

    // Get patients who have bookings at this center
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        patient_id,
        created_at,
        patients:patient_id (
          name,
          email,
          phone
        )
      `)
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Remove duplicates and format the data
    const uniquePatients = Array.from(
      new Map(
        (bookings || []).map(booking => [
          booking.patient_id, 
          {
            id: booking.patient_id,
            name: booking.patients?.name || 'Unknown Patient',
            email: booking.patients?.email || '',
            phone: booking.patients?.phone || '',
            created_at: booking.created_at
          }
        ])
      ).values()
    );

    res.json({
      success: true,
      patients: uniquePatients
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get analytics - /api/center-dashboard/analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const centerId = req.user.center_id || req.user.id;

    // Get basic analytics for this center with patient demographics
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        *,
        lab_test_types:lab_test_type_id(name, category),
        patients:patient_id(gender, date_of_birth, name, phone, email)
      `)
      .eq('center_id', centerId);

    if (error) {
      throw error;
    }

    // Calculate analytics - try different amount field names
    const totalBookings = bookings?.length || 0;
    const totalRevenue = bookings?.reduce((sum, b) => {
      const amount = b.total_amount || b.amount || b.fee || b.price || b.cost || 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0) || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;

    // Get today's data
    const today = new Date().toISOString().slice(0, 10);
    const todayBookings = bookings?.filter(b => b.created_at?.startsWith(today)) || [];

    // Calculate demographics
    const uniquePatients = new Set();
    const ageGroups = { '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    const genderDistribution = { male: 0, female: 0, other: 0 };
    const testTypes = {};
    const patientDemographics = new Map(); // Store unique patient demographics

    // First pass: collect unique patients and their demographics
    (bookings || []).forEach(booking => {
      if (booking.patient_id && !patientDemographics.has(booking.patient_id)) {
        uniquePatients.add(booking.patient_id);
        
        // Store patient demographics only once per unique patient
        if (booking.patients) {
          patientDemographics.set(booking.patient_id, {
            gender: booking.patients.gender,
            date_of_birth: booking.patients.date_of_birth
          });
        }
      }

      // Test type distribution (count per booking, not per patient)
      if (booking.lab_test_types?.name) {
        const testType = booking.lab_test_types.name;
        testTypes[testType] = (testTypes[testType] || 0) + 1;
      }
    });

    // Second pass: calculate demographics from unique patients only
    patientDemographics.forEach((patientData, patientId) => {
      // Gender distribution
      if (patientData.gender) {
        const gender = patientData.gender.toLowerCase();
        if (gender in genderDistribution) {
          genderDistribution[gender]++;
        } else {
          genderDistribution['other']++;
        }
      }

      // Age distribution
      if (patientData.date_of_birth) {
        const age = new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear();
        if (age >= 18 && age <= 30) ageGroups['18-30']++;
        else if (age >= 31 && age <= 45) ageGroups['31-45']++;
        else if (age >= 46 && age <= 60) ageGroups['46-60']++;
        else if (age > 60) ageGroups['60+']++;
      }
    });

    res.json({
      success: true,
      analytics: {
        totalBookings,
        totalRevenue,
        completedBookings,
        pendingBookings,
        todayBookings: todayBookings.length,
        todayRevenue: todayBookings.reduce((sum, b) => {
          const amount = b.total_amount || b.amount || b.fee || b.price || b.cost || 0;
          return sum + (typeof amount === 'number' ? amount : 0);
        }, 0),
        totalPatients: uniquePatients.size,
        patientDemographics: {
          ageGroups,
          genderDistribution,
          testTypes,
        }
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update center profile - /api/center-dashboard/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    const centerId = req.user.center_id || req.user.id;
    const updates = req.body;
    
    const { data: center, error } = await supabase
      .from('centers')
      .update(updates)
      .eq('id', centerId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.json({
      success: true,
      center
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Configure multer for lab result uploads
const labResultUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    try {
      validateFile.labResult(file);
      cb(null, true);
    } catch (error) {
      cb(error);
    }
  }
});

// Upload lab result file - /api/center-dashboard/upload-lab-result
router.post('/upload-lab-result', authenticateToken, labResultUpload.single('labResult'), async (req, res) => {
  try {
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can upload lab results' });
    }

    const { booking_id, result_notes } = req.body;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Lab result file is required' });
    }

    if (!booking_id) {
      return res.status(400).json({ error: 'Booking ID is required' });
    }

    const centerId = req.user.center_id || req.user.id;

    // Verify the booking belongs to this center
    const { data: booking, error: bookingError } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, center_id, status')
      .eq('id', booking_id)
      .eq('center_id', centerId)
      .single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Booking not found or does not belong to your center' });
    }

    // Upload file to Supabase Storage
    const uploadResult = await storageService.uploadLabResult(
      booking_id,
      centerId,
      req.file.buffer,
      req.file.originalname
    );

    // Update the lab booking with result information
    const { data: updatedBooking, error: updateError } = await supabase
      .from('lab_bookings')
      .update({
        result_file_url: uploadResult.url,
        result_file_path: uploadResult.path,
        result_notes: result_notes || '',
        result_date: new Date().toISOString(),
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', booking_id)
      .select()
      .single();

    if (updateError) {
      // Clean up uploaded file on database error
      try {
        await storageService.deleteFile('medical-documents', uploadResult.path);
      } catch (cleanupError) {
      }
      throw updateError;
    }


    res.status(201).json({
      success: true,
      message: 'Lab result uploaded successfully',
      data: {
        booking_id: updatedBooking.id,
        result_file_url: uploadResult.url,
        result_date: updatedBooking.result_date,
        status: updatedBooking.status
      }
    });

  } catch (error) {
    
    res.status(500).json({
      error: error.message || 'Failed to upload lab result',
      success: false
    });
  }
});

// Get signed URL for downloading lab result - /api/center-dashboard/download-lab-result/:booking_id
router.get('/download-lab-result/:booking_id', authenticateToken, async (req, res) => {
  try {
    if (!['center', 'patient', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { booking_id } = req.params;
    const centerId = req.user.center_id || req.user.id;

    // Get the booking with result file info
    let query = supabase
      .from('lab_bookings')
      .select('id, patient_id, center_id, result_file_path, result_file_url')
      .eq('id', booking_id);

    // Centers can only access their own bookings, patients can access their own bookings
    if (req.user.role === 'center') {
      query = query.eq('center_id', centerId);
    } else if (req.user.role === 'patient') {
      query = query.eq('patient_id', req.user.id);
    }
    // Admins can access any booking (no additional filter)

    const { data: booking, error: bookingError } = await query.single();

    if (bookingError || !booking) {
      return res.status(404).json({ error: 'Lab result not found or access denied' });
    }

    if (!booking.result_file_path) {
      return res.status(404).json({ error: 'No lab result file available for this booking' });
    }

    // Get public URL for download - no expiry, always accessible
    const publicUrlResult = await storageService.getPublicUrl(
      'medical-documents', 
      booking.result_file_path
    );

    res.json({
      success: true,
      download_url: publicUrlResult.publicUrl,
      expires_at: null // Never expires
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to generate download link' });
  }
});

// Verify authentication endpoint - /api/center-dashboard/verify-auth
router.get('/verify-auth', authenticateToken, async (req, res) => {
  try {
    
    if (req.user.role !== 'center') {
      return res.status(403).json({ error: 'Only centers can access this endpoint' });
    }

    // Return the authenticated user details
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
        center_id: req.user.center_id
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
