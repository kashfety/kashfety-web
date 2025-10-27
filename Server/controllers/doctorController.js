// Updated Doctor Controller to work with unified schema
// This replaces the existing doctorController.js

import { supabaseAdmin, storageHelpers, TABLES } from "../utils/supabase.js";

// Set doctor schedule (work hours)
export const setSchedule = async (req, res) => {
  try {
    // Use authenticated doctor's UID instead of URL parameter for security
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const { workHours } = req.body;
    
    // Update doctor in unified users table
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        work_hours: workHours,
        updated_at: new Date().toISOString(),
      })
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data
    });
  } catch (error) {
    console.error("Schedule update error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Set vacation days
export const setVacationDays = async (req, res) => {
  try {
    // Use authenticated doctor's UID instead of URL parameter for security
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const { vacationDays } = req.body;
    
    // Update doctor in unified users table
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        vacation_days: vacationDays,
        updated_at: new Date().toISOString(),
      })
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: "Vacation days updated successfully",
      data
    });
  } catch (error) {
    console.error("Vacation days update error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor profile
export const getDoctorProfile = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor from unified users table
    const { data: doctor, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    res.status(200).json({
      success: true,
      doctor
    });
  } catch (error) {
    console.error("Get doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update doctor profile
export const updateDoctorProfile = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const updateData = req.body;
    
    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.uid;
    delete updateData.role;
    delete updateData.created_at;
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString();
    
    // Update doctor in unified users table
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updateData)
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      doctor: data
    });
  } catch (error) {
    console.error("Update doctor profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all doctors (for patient booking)
export const getAllDoctors = async (req, res) => {
  try {
    const { specialty, search } = req.query;
    console.log('📋 Fetching all doctors from unified users table...');
    
    // Use the unified users table for doctors
    let query = supabaseAdmin
      .from(TABLES.USERS)
      .select(`
        id,
        uid,
        name,
        first_name,
        last_name,
        email,
        phone,
        specialty,
        qualifications,
        rating,
        profile_picture,
        bio,
        experience_years,
        consultation_fee,
        work_hours,
        vacation_days,
        created_at,
        updated_at
      `)
      .eq('role', 'doctor')
      .order('rating', { ascending: false });
    
    // Filter by specialty if provided
    if (specialty) {
      query = query.ilike('specialty', `%${specialty}%`);
    }
    
    // Search by name if provided
    if (search) {
      query = query.or(`name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    }
    
    const { data: doctors, error } = await query;
    
    if (error) {
      console.error('❌ Error fetching doctors:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch doctors',
        details: error.message 
      });
    }

    console.log(`✅ Successfully fetched ${doctors?.length || 0} doctors from unified table`);
    
    res.status(200).json({
      success: true,
      doctors: doctors || [],
      count: doctors?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error in getAllDoctors:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get doctor from unified users table
    const { data: doctor, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .eq('role', 'doctor')
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    // Get doctor's availability for the next 7 days
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const { data: availability, error: availError } = await supabaseAdmin
      .from(TABLES.DOCTOR_AVAILABILITY)
      .select('*')
      .eq('doctor_id', id)
      .gte('date', today.toISOString().split('T')[0])
      .lte('date', nextWeek.toISOString().split('T')[0])
      .order('date', { ascending: true });
    
    res.status(200).json({
      success: true,
      doctor: {
        ...doctor,
        availability: availability || []
      }
    });
  } catch (error) {
    console.error("Get doctor by ID error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor availability
export const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    
    // Verify doctor exists in unified users table
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    // Get availability for specific date
    const { data: availability, error } = await supabaseAdmin
      .from(TABLES.DOCTOR_AVAILABILITY)
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('date', date)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }
    
    res.status(200).json({
      success: true,
      availability: availability || null,
      doctor: doctor
    });
  } catch (error) {
    console.error("Get doctor availability error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Set doctor availability
export const setDoctorAvailability = async (req, res) => {
  try {
    const { doctorId, date } = req.params;
    const { isAvailable, slots, notes, homeAvailable } = req.body;
    
    // Verify doctor exists and user has permission
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, uid')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    // Check if user has permission to modify this doctor's schedule
    if (doctor.uid !== doctorUid && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this doctor's schedule"
      });
    }
    
    // Upsert availability
    const { data, error } = await supabaseAdmin
      .from(TABLES.DOCTOR_AVAILABILITY)
      .upsert({
        doctor_id: doctorId,
        date: date,
        is_available: isAvailable,
        slots: slots || [],
        notes: notes || '',
        home_available: homeAvailable || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'doctor_id,date'
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: "Availability updated successfully",
      availability: data
    });
  } catch (error) {
    console.error("Set doctor availability error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor's appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const { status, date, limit = 50 } = req.query;
    
    // Get doctor ID from unified users table
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    // Build query for appointments
    let query = supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        patient:patient_id (
          id,
          name,
          phone,
          email,
          date_of_birth
        )
      `)
      .eq('doctor_id', doctor.id)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(limit);
    
    // Add filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (date) {
      query = query.eq('appointment_date', date);
    }
    
    const { data: appointments, error } = await query;
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      appointments: appointments || [],
      count: appointments?.length || 0
    });
  } catch (error) {
    console.error("Get doctor appointments error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor ID
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    // Update appointment
    const { data, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .update({
        status: status,
        notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('doctor_id', doctor.id)
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found or not authorized"
      });
    }
    
    res.status(200).json({
      success: true,
      message: "Appointment updated successfully",
      appointment: data
    });
  } catch (error) {
    console.error("Update appointment status error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Upload profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }
    
    // Upload to storage
    const fileName = `profile_${doctorUid}_${Date.now()}.${req.file.originalname.split('.').pop()}`;
    const { data: uploadData, error: uploadError } = await storageHelpers.uploadFile(
      'profile-pictures',
      fileName,
      req.file.buffer,
      {
        contentType: req.file.mimetype,
        cacheControl: '3600'
      }
    );
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get public URL
    const { data: urlData } = await storageHelpers.getPublicUrl('profile-pictures', fileName);
    
    // Update doctor profile with new picture URL
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({
        profile_picture: urlData.publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      profilePicture: urlData.publicUrl,
      doctor: data
    });
  } catch (error) {
    console.error("Upload profile picture error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Additional utility functions for the unified schema

// Get doctor statistics
export const getDoctorStats = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor ID
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    
    // Get appointment statistics
    const { data: appointments, error: appointmentError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('status, appointment_date')
      .eq('doctor_id', doctor.id);
    
    if (appointmentError) {
      throw appointmentError;
    }
    
    // Calculate statistics
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
    const upcomingAppointments = appointments.filter(a => 
      a.status === 'scheduled' && new Date(a.appointment_date) >= new Date()
    ).length;
    
    res.status(200).json({
      success: true,
      stats: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        upcomingAppointments,
        completionRate: totalAppointments > 0 ? (completedAppointments / totalAppointments * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error("Get doctor stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor schedule
export const getSchedule = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('work_hours, vacation_days')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      data: {
        workHours: data.work_hours,
        vacationDays: data.vacation_days
      }
    });
  } catch (error) {
    console.error("Get schedule error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update doctor schedule
export const updateSchedule = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const { workHours, vacationDays } = req.body;
    
    const updateData = {};
    if (workHours !== undefined) updateData.work_hours = workHours;
    if (vacationDays !== undefined) updateData.vacation_days = vacationDays;
    updateData.updated_at = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .update(updateData)
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: "Schedule updated successfully",
      data
    });
  } catch (error) {
    console.error("Update schedule error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get patients list for doctor
export const getPatientsList = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor's ID from users table
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError) {
      throw doctorError;
    }
    
    // Get unique patients who have appointments with this doctor
    const { data, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        patient_id,
        users!fk_appointments_patient (
          id,
          name,
          email,
          phone,
          date_of_birth,
          medical_history,
          allergies
        )
      `)
      .eq('doctor_id', doctorData.id)
      .not('users', 'is', null);
    
    if (error) {
      throw error;
    }
    
    // Remove duplicates and format data
    const uniquePatients = data.reduce((acc, appointment) => {
      const patient = appointment.users;
      if (patient && !acc.find(p => p.id === patient.id)) {
        acc.push(patient);
      }
      return acc;
    }, []);
    
    res.status(200).json({
      success: true,
      data: uniquePatients
    });
  } catch (error) {
    console.error("Get patients list error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor analytics
export const getDoctorAnalytics = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor's ID from users table
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError) {
      throw doctorError;
    }
    
    // Get appointment analytics
    const { data: appointments, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('*')
      .eq('doctor_id', doctorData.id);
    
    if (error) {
      throw error;
    }
    
    const totalAppointments = appointments.length;
    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const cancelledAppointments = appointments.filter(a => a.status === 'cancelled').length;
    const upcomingAppointments = appointments.filter(a => a.status === 'confirmed' || a.status === 'pending').length;
    
    res.status(200).json({
      success: true,
      data: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        upcomingAppointments,
        completionRate: totalAppointments > 0 ? ((completedAppointments / totalAppointments) * 100).toFixed(1) : 0
      }
    });
  } catch (error) {
    console.error("Get doctor analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get patient demographics
export const getPatientDemographics = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor's ID from users table
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError) {
      throw doctorError;
    }
    
    // Get unique patients with demographics
    const { data, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        patient_id,
        users!fk_appointments_patient (
          id,
          date_of_birth,
          gender
        )
      `)
      .eq('doctor_id', doctorData.id)
      .not('users', 'is', null);
    
    if (error) {
      throw error;
    }
    
    // Process demographics
    const uniquePatients = data.reduce((acc, appointment) => {
      const patient = appointment.users;
      if (patient && !acc.find(p => p.id === patient.id)) {
        acc.push(patient);
      }
      return acc;
    }, []);
    
    const demographics = {
      totalPatients: uniquePatients.length,
      genderDistribution: {
        male: uniquePatients.filter(p => p.gender === 'male').length,
        female: uniquePatients.filter(p => p.gender === 'female').length,
        other: uniquePatients.filter(p => p.gender && p.gender !== 'male' && p.gender !== 'female').length
      }
    };
    
    res.status(200).json({
      success: true,
      data: demographics
    });
  } catch (error) {
    console.error("Get patient demographics error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get appointment stats
export const getAppointmentStats = async (req, res) => {
  try {
    return getDoctorAnalytics(req, res); // Reuse the analytics function
  } catch (error) {
    console.error("Get appointment stats error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get financial analytics
export const getFinancialAnalytics = async (req, res) => {
  try {
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor's ID from users table
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, consultation_fee')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError) {
      throw doctorError;
    }
    
    // Get completed appointments for financial calculation
    const { data: appointments, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('consultation_fee, appointment_date')
      .eq('doctor_id', doctorData.id)
      .eq('status', 'completed');
    
    if (error) {
      throw error;
    }
    
    const totalRevenue = appointments.reduce((sum, apt) => {
      return sum + (apt.consultation_fee || doctorData.consultation_fee || 0);
    }, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1); // First day of current month
    
    const monthlyRevenue = appointments
      .filter(apt => new Date(apt.appointment_date) >= thisMonth)
      .reduce((sum, apt) => {
        return sum + (apt.consultation_fee || doctorData.consultation_fee || 0);
      }, 0);
    
    res.status(200).json({
      success: true,
      data: {
        totalRevenue,
        monthlyRevenue,
        completedAppointments: appointments.length,
        averageRevenuePerAppointment: appointments.length > 0 ? (totalRevenue / appointments.length) : 0
      }
    });
  } catch (error) {
    console.error("Get financial analytics error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get patient details
export const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    
    // Get doctor's ID from users table
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError) {
      throw doctorError;
    }
    
    // Verify that this patient has appointments with this doctor
    const { data: appointmentCheck, error: appointmentError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('id')
      .eq('doctor_id', doctorData.id)
      .eq('patient_id', patientId)
      .limit(1);
    
    if (appointmentError) {
      throw appointmentError;
    }
    
    if (!appointmentCheck || appointmentCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to this patient's details"
      });
    }
    
    // Get patient details
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select(`
        id,
        name,
        first_name,
        last_name,
        email,
        phone,
        date_of_birth,
        gender,
        medical_history,
        allergies,
        medications,
        created_at
      `)
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();
    
    if (patientError) {
      throw patientError;
    }
    
    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    console.error("Get patient details error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create medical record
export const createMedicalRecord = async (req, res) => {
  try {
    const { patientId } = req.params;
    const doctorUid = req.authenticatedDoctorUid || req.user.uid;
    const { diagnosis, treatment, prescription, notes, appointmentId } = req.body;
    
    // Get doctor's ID from users table
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('uid', doctorUid)
      .eq('role', 'doctor')
      .single();
    
    if (doctorError) {
      throw doctorError;
    }
    
    // Verify that this patient has appointments with this doctor
    const { data: appointmentCheck, error: appointmentError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('id')
      .eq('doctor_id', doctorData.id)
      .eq('patient_id', patientId)
      .limit(1);
    
    if (appointmentError) {
      throw appointmentError;
    }
    
    if (!appointmentCheck || appointmentCheck.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have access to create medical records for this patient"
      });
    }
    
    // Create medical record
    const { data, error } = await supabaseAdmin
      .from(TABLES.MEDICAL_RECORDS)
      .insert({
        doctor_id: doctorData.id,
        patient_id: patientId,
        appointment_id: appointmentId,
        diagnosis,
        treatment,
        prescription,
        notes,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      throw error;
    }
    
    res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      data
    });
  } catch (error) {
    console.error("Create medical record error:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get doctor's working days for a center (public endpoint for patients)
export const getDoctorWorkingDays = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { center_id } = req.query;

    console.log(`🔍 Getting working days - Doctor: ${doctorId}, Center: ${center_id || 'ALL'}`);

    let query = supabaseAdmin
      .from('doctor_schedules')
      .select('day_of_week')
      .eq('doctor_id', doctorId)
      .eq('is_available', true);

    if (center_id) {
      query = query.eq('center_id', center_id);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Working days query error:', error);
      return res.status(500).json({ error: 'Failed to fetch working days' });
    }

    const workingDays = [...new Set(schedules?.map(s => s.day_of_week) || [])];
    workingDays.sort();

    console.log(`✅ Doctor ${doctorId} working days ${center_id ? `at center ${center_id}` : '(all centers)'}: [${workingDays.join(', ')}]`);

    res.json({
      success: true,
      doctor_id: doctorId,
      center_id: center_id || null,
      working_days: workingDays
    });

  } catch (error) {
    console.error('Working days error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
