// ULTRA SIMPLIFIED APPOINTMENT MANAGEMENT - Works with unified users table only
import express from "express";
import { supabaseAdmin } from "../utils/supabase.js";
import { verifyToken, isDoctor, isPatient, ultraSimpleLogin } from "../middleware/ultraSimplifiedAuth.js";

const router = express.Router();

// Ultra Simple Login Endpoint
router.post("/login", async (req, res) => {
  try {
    console.log('=== ULTRA SIMPLE LOGIN ENDPOINT ===');
    const { email, password } = req.body;
    
    const result = await ultraSimpleLogin(email, password);
    
    res.json({
      success: true,
      message: "Login successful",
      ...result
    });
    
  } catch (error) {
    console.error('Login endpoint error:', error);
    res.status(401).json({
      success: false,
      message: error.message || "Login failed"
    });
  }
});

// Create Appointment - Ultra Simplified
router.post("/booking/create", verifyToken, async (req, res) => {
  try {
    console.log('=== ULTRA SIMPLE APPOINTMENT BOOKING ===');
    console.log('Request body:', req.body);
    console.log('Authenticated user:', req.user);
    
    // Validate user is a patient
    if (req.user.role !== 'patient') {
      return res.status(403).json({
        success: false,
        message: "Only patients can book appointments"
      });
    }

    // Validate doctor exists and is actually a doctor
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, role, specialty, consultation_fee')
      .eq('id', req.body.doctor_user_id)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctor) {
      return res.status(400).json({
        success: false,
        message: "Selected doctor not found or invalid"
      });
    }

    console.log('Doctor validated:', doctor);

    // Prepare appointment data
    const appointmentData = {
      patient_user_id: req.user.id, // Use authenticated user ID directly
      doctor_user_id: req.body.doctor_user_id,
      appointment_date: req.body.appointment_date,
      appointment_time: req.body.appointment_time,
      duration: req.body.duration || 30,
      type: req.body.type || 'consultation',
      status: 'scheduled',
      booking_reference: `APT-${Date.now()}`,
      payment_method: req.body.payment_method || 'cash',
      payment_status: 'pending',
      notes: req.body.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate required fields
    if (!appointmentData.appointment_date || !appointmentData.appointment_time) {
      return res.status(400).json({
        success: false,
        message: "Appointment date and time are required"
      });
    }

    console.log('Prepared appointment data:', appointmentData);

    // Create appointment (no RLS blocking!)
    const { data: appointment, error: createError } = await supabaseAdmin
      .from('appointments')
      .insert([appointmentData])
      .select(`
        *,
        patient:patient_user_id (id, first_name, last_name, email, phone),
        doctor:doctor_user_id (id, first_name, last_name, specialty, consultation_fee)
      `)
      .single();

    console.log('Appointment creation result:', { appointment, createError });

    if (createError) {
      console.error('Appointment creation failed:', createError);
      return res.status(500).json({
        success: false,
        message: `Failed to create appointment: ${createError.message}`
      });
    }

    console.log('✅ SUCCESS! Appointment created:', appointment);

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment: appointment
    });

  } catch (error) {
    console.error('=== APPOINTMENT BOOKING ERROR ===');
    console.error('Error:', error);
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to book appointment"
    });
  }
});

// Get Patient Appointments
router.get("/patient/appointments", verifyToken, isPatient, async (req, res) => {
  try {
    console.log('=== GET PATIENT APPOINTMENTS ===');
    console.log('Patient user ID:', req.user.id);

    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:patient_user_id (id, first_name, last_name, email, phone),
        doctor:doctor_user_id (id, first_name, last_name, specialty, consultation_fee)
      `)
      .eq('patient_user_id', req.user.id)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch appointments:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch appointments"
      });
    }

    console.log('Appointments found:', appointments?.length || 0);

    res.json({
      success: true,
      appointments: appointments || []
    });

  } catch (error) {
    console.error('Get patient appointments error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve appointments"
    });
  }
});

// Get All Doctors (for booking interface)
router.get("/doctors", async (req, res) => {
  try {
    console.log('=== GET ALL DOCTORS ===');

    const { data: doctors, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, specialty, consultation_fee, bio, availability_status')
      .eq('role', 'doctor')
      .eq('availability_status', 'available')
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Failed to fetch doctors:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch doctors"
      });
    }

    console.log('Doctors found:', doctors?.length || 0);

    res.json({
      success: true,
      doctors: doctors || []
    });

  } catch (error) {
    console.error('Get doctors error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctors"
    });
  }
});

// Get Doctor Appointments (for doctor dashboard)
router.get("/doctor/appointments", verifyToken, isDoctor, async (req, res) => {
  try {
    console.log('=== GET DOCTOR APPOINTMENTS ===');
    console.log('Doctor user ID:', req.user.id);

    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patient:patient_user_id (id, first_name, last_name, email, phone, age),
        doctor:doctor_user_id (id, first_name, last_name, specialty)
      `)
      .eq('doctor_user_id', req.user.id)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Failed to fetch doctor appointments:', error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch appointments"
      });
    }

    console.log('Doctor appointments found:', appointments?.length || 0);

    res.json({
      success: true,
      appointments: appointments || []
    });

  } catch (error) {
    console.error('Get doctor appointments error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor appointments"
    });
  }
});

// User Registration - Ultra Simplified
router.post("/register", async (req, res) => {
  try {
    console.log('=== ULTRA SIMPLE REGISTRATION ===');
    const { email, password, first_name, last_name, phone, role } = req.body;
    
    // Validate required fields
    if (!email || !password || !first_name || !last_name || !role) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email already exists"
      });
    }

    // Create new user
    const newUser = {
      id: `${role}-${Date.now()}`,
      email,
      password, // In production, hash this!
      first_name,
      last_name,
      phone,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: user, error: createError } = await supabaseAdmin
      .from('users')
      .insert([newUser])
      .select()
      .single();

    if (createError) {
      console.error('User creation failed:', createError);
      return res.status(500).json({
        success: false,
        message: "Failed to create user account"
      });
    }

    console.log('User created successfully:', user);

    // Generate token (just use user ID)
    const token = user.id;

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`
      },
      token: token
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
});

export default router;
