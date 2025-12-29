// ULTRA SIMPLIFIED APPOINTMENT MANAGEMENT - Works with unified users table only
// SECURITY UPDATE: Replaced ultraSimplifiedAuth with standard JWT authentication
import express from "express";
import { supabaseAdmin } from "../utils/supabase.js";
import { authenticateToken, authenticateRole } from "../middleware/auth.js";

const router = express.Router();

// SECURITY: Login endpoint removed - use /api/auth/login instead
// SECURITY: Register endpoint removed - use /api/auth/register instead

// Create Appointment - Requires authentication
router.post("/booking/create", authenticateToken, authenticateRole(['patient']), async (req, res) => {
  try {
    
    // Role check is handled by authenticateRole(['patient']) middleware

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


    if (createError) {
      return res.status(500).json({
        success: false,
        message: `Failed to create appointment: ${createError.message}`
      });
    }


    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment: appointment
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message || "Failed to book appointment"
    });
  }
});

// Get Patient Appointments
router.get("/patient/appointments", authenticateToken, authenticateRole(['patient']), async (req, res) => {
  try {

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
      return res.status(500).json({
        success: false,
        message: "Failed to fetch appointments"
      });
    }


    res.json({
      success: true,
      appointments: appointments || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve appointments"
    });
  }
});

// Get All Doctors (for booking interface)
router.get("/doctors", async (req, res) => {
  try {

    const { data: doctors, error } = await supabaseAdmin
      .from('users')
      .select('id, first_name, last_name, specialty, consultation_fee, bio, availability_status')
      .eq('role', 'doctor')
      .eq('availability_status', 'available')
      .order('first_name', { ascending: true });

    if (error) {
      return res.status(500).json({
        success: false,
        message: "Failed to fetch doctors"
      });
    }


    res.json({
      success: true,
      doctors: doctors || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctors"
    });
  }
});

// Get Doctor Appointments (for doctor dashboard)
router.get("/doctor/appointments", authenticateToken, authenticateRole(['doctor']), async (req, res) => {
  try {

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
      return res.status(500).json({
        success: false,
        message: "Failed to fetch appointments"
      });
    }


    res.json({
      success: true,
      appointments: appointments || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve doctor appointments"
    });
  }
});

// SECURITY: Registration endpoint removed - use /api/auth/register instead
// The previous implementation stored plain text passwords which is a critical security vulnerability

export default router;
