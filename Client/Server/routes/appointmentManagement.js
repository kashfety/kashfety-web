import express from "express";
import { supabaseAdmin } from "../utils/supabase.js";
import { authenticateToken, isDoctor, isPatient, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Appointment Booking & Creation
router.post("/booking/create", authenticateToken, async (req, res) => {
  try {
    
    // Use the authenticated user's patient ID from the token, not from the request body
    const appointmentData = {
      ...req.body,
      patient_id: req.user.id, // Override with authenticated user's patient ID
      // Keep the original type for the type field (now allowed in constraint)
      type: req.body.type || 'consultation',
      // Map to appointment_type if needed (seems to be a duplicate field)
      appointment_type: req.body.type || 'consultation',
      // Set default values for new fields
      payment_method: req.body.payment_method || 'cash',
      payment_status: req.body.payment_status || 'pending',
      booking_reference: `APT-${Date.now()}`,
      status: 'scheduled',
      created_at: new Date().toISOString()
    };

    // Validate required fields
    if (!appointmentData.doctor_id) {
      return res.status(400).json({
        success: false,
        message: "Doctor ID is required"
      });
    }

    if (!appointmentData.appointment_date) {
      return res.status(400).json({
        success: false,
        message: "Appointment date is required"
      });
    }

    if (!appointmentData.appointment_time) {
      return res.status(400).json({
        success: false,
        message: "Appointment time is required"
      });
    }


    // Validate that the doctor exists before creating the appointment
    const { data: doctorExists, error: doctorCheckError } = await supabaseAdmin
      .from('doctors')
      .select('id, name, specialty')
      .eq('id', appointmentData.doctor_id)
      .single();

    if (doctorCheckError || !doctorExists) {
      return res.status(400).json({
        success: false,
        message: "Selected doctor not found or unavailable"
      });
    }


    // Ensure patient record exists for the authenticated user
    // First check by uid (frontend compatibility)
    let { data: existingPatient, error: patientCheckError } = await supabaseAdmin
      .from('patients')
      .select('id, name, email, uid')
      .eq('uid', req.user.id)
      .single();

    // If not found by uid, try by id (direct match)
    if (patientCheckError && patientCheckError.code === 'PGRST116') {
      const { data: patientById, error: idError } = await supabaseAdmin
        .from('patients')
        .select('id, name, email, uid')
        .eq('id', req.user.id)
        .single();
      
      if (patientById) {
        existingPatient = patientById;
        patientCheckError = null;
      }
    }

    let patientId = existingPatient?.id;

    if (patientCheckError && patientCheckError.code === 'PGRST116') {
      // Patient doesn't exist, create one with proper uid field
      const { data: newPatient, error: createPatientError } = await supabaseAdmin
        .from('patients')
        .insert([{
          uid: req.user.id, // Set uid for frontend compatibility
          user_id: req.user.id, // Set user_id for backend references
          name: req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'Patient User',
          email: req.user.email,
          age: req.user.user_metadata?.age || null,
          gender: req.user.user_metadata?.gender || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createPatientError) {
        return res.status(500).json({
          success: false,
          message: "Failed to create patient profile"
        });
      }
      patientId = newPatient.id;
    } else if (patientCheckError) {
      return res.status(500).json({
        success: false,
        message: "Patient validation failed"
      });
    } else {
      patientId = existingPatient.id;
    }

    // Update appointment data to use the correct patient ID
    appointmentData.patient_id = patientId;

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([appointmentData])
      .select(`
        *,
        doctors(id, name, specialty, consultation_fee),
        patients(id, name, age, phone)
      `)
      .single();


    if (error) {
      throw error;
    }

    res.status(201).json({
      success: true,
      message: "Appointment booked successfully",
      appointment: data
    });
  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/booking/emergency", authenticateToken, async (req, res) => {
  try {
    // Ensure patient record exists for the authenticated user
    // First check by uid (frontend compatibility)
    let { data: existingPatient, error: patientCheckError } = await supabaseAdmin
      .from('patients')
      .select('id, name, email, uid')
      .eq('uid', req.user.id)
      .single();

    // If not found by uid, try by id (direct match)
    if (patientCheckError && patientCheckError.code === 'PGRST116') {
      const { data: patientById, error: idError } = await supabaseAdmin
        .from('patients')
        .select('id, name, email, uid')
        .eq('id', req.user.id)
        .single();
      
      if (patientById) {
        existingPatient = patientById;
        patientCheckError = null;
      }
    }

    let patientId = existingPatient?.id;

    if (patientCheckError && patientCheckError.code === 'PGRST116') {
      // Patient doesn't exist, create one with proper uid field
      const { data: newPatient, error: createPatientError } = await supabaseAdmin
        .from('patients')
        .insert([{
          uid: req.user.id, // Set uid for frontend compatibility
          user_id: req.user.id, // Set user_id for backend references
          name: req.user.user_metadata?.name || req.user.email?.split('@')[0] || 'Emergency Patient',
          email: req.user.email,
          age: req.user.user_metadata?.age || null,
          gender: req.user.user_metadata?.gender || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (createPatientError) {
        return res.status(500).json({
          success: false,
          message: "Failed to create patient profile"
        });
      }
      patientId = newPatient.id;
    } else if (patientCheckError) {
      return res.status(500).json({
        success: false,
        message: "Patient validation failed"
      });
    } else {
      patientId = existingPatient.id;
    }

    const emergencyData = {
      ...req.body,
      patient_id: patientId, // Use the correct patient ID
      type: 'emergency', // Always set to emergency for this endpoint
      appointment_type: 'emergency', // Set both fields
      payment_method: req.body.payment_method || 'cash',
      payment_status: req.body.payment_status || 'pending',
      status: 'scheduled',
      booking_reference: `EMG-${Date.now()}`,
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert([emergencyData])
      .select(`
        *,
        doctors(id, name, specialty),
        patients(id, name, phone)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Emergency appointment scheduled successfully",
      appointment: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test endpoint to verify server is working
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Appointment management server is working"
  });
});

// Test endpoint to check database connection
router.get("/test-db", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select('id, status')
      .limit(1);
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`
      });
    }
    
    res.json({
      success: true,
      message: "Database connection working",
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Exception: ${error.message}`
    });
  }
});

// Test endpoint to list appointments
router.get("/list-appointments", async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(id, name, specialty),
        patients(id, name, phone),
        centers(id, name, address)
      `)
      .limit(10)
      .order('appointment_date', { ascending: true });
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: `Database error: ${error.message}`
      });
    }
    
    res.json({
      success: true,
      message: "Appointments list",
      data: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Exception: ${error.message}`
    });
  }
});

// Test endpoint to reschedule a specific appointment
router.put("/test-reschedule/:appointmentId", async (req, res) => {
  try {
    const appointmentId = req.params.appointmentId;
    
    // Try to fetch the appointment first
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();
    
    
    if (fetchError) {
      return res.status(500).json({
        success: false,
        message: `Fetch error: ${fetchError.message}`
      });
    }
    
    if (!existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    
    // Try a simple update
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({
        notes: `${existingAppointment.notes || ''}\nTest update at ${new Date().toISOString()}`
      })
      .eq('id', appointmentId)
      .select('id, notes')
      .single();
    
    
    if (error) {
      return res.status(500).json({
        success: false,
        message: `Update error: ${error.message}`
      });
    }
    
    res.json({
      success: true,
      message: "Test update successful",
      data: data
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Test error: ${error.message}`
    });
  }
});

// Appointment Status Management
router.put("/status/:appointmentId/update", authenticateToken, async (req, res) => {
  try {
    const { status, notes } = req.body;
    const appointmentId = req.params.appointmentId;

    console.log('Status update request received:', {
      appointmentId,
      status,
      notes,
      body: req.body
    });
    
    if (!['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status"
      });
    }

    // First, check if the appointment exists
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    // Check if appointment is already cancelled or completed
    if (existingAppointment.status === 'cancelled' || existingAppointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: `Cannot update status of a ${existingAppointment.status} appointment`
      });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({ 
        status,
        notes: notes ? `${existingAppointment.notes || ''}\n${notes}` : existingAppointment.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctors(name, specialty),
        patients(name, phone)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: "Appointment status updated successfully",
      appointment: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update appointment status"
    });
  }
});

router.put("/reschedule/:appointmentId", authenticateToken, async (req, res) => {
  try {
    const { appointment_date, appointment_time, reason } = req.body;
    const appointmentId = req.params.appointmentId;

    console.log('Reschedule request received:', {
      appointmentId,
      appointment_date,
      appointment_time,
      reason,
      body: req.body,
      headers: req.headers,
      method: req.method,
      url: req.url,
      user: req.user // This will show the authenticated user info
    });

    // Validate required fields
    if (!appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        message: "appointment_date and appointment_time are required"
      });
    }

    // First, check if the appointment exists
    const { data: existingAppointment, error: fetchError } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !existingAppointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    // Check if appointment is already cancelled or completed
    if (existingAppointment.status === 'cancelled' || existingAppointment.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: "Cannot reschedule a cancelled or completed appointment"
      });
    }

    console.log('Appointment found and valid for rescheduling:', {
      id: existingAppointment.id,
      status: existingAppointment.status,
      current_date: existingAppointment.appointment_date,
      current_time: existingAppointment.appointment_time
    });

    console.log('Updating appointment with data:', {
      appointment_date,
      appointment_time,
      notes: reason ? `${existingAppointment.notes || ''}\nRescheduled: ${reason}` : `${existingAppointment.notes || ''}\nRescheduled by request`
    });

    // Update the appointment
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .update({
        appointment_date,
        appointment_time,
        notes: reason ? `${existingAppointment.notes || ''}\nRescheduled: ${reason}` : `${existingAppointment.notes || ''}\nRescheduled by request`,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctors(name, specialty),
        patients(name, phone)
      `)
      .single();


    if (error) {
      throw error;
    }

    res.json({
      success: true,
      message: "Appointment rescheduled successfully",
      appointment: data
    });
  } catch (error) {
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    res.status(500).json({
      success: false,
      message: error.message || "Failed to reschedule appointment",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Appointment Details & Information
router.get("/details/:appointmentId", authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(
          name, 
          specialty, 
          profile_picture, 
          consultation_fee,
          users(phone, email)
        ),
        patients(
          name, 
          age, 
          gender,
          users(phone, email)
        )
      `)
      .eq('id', req.params.appointmentId)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }

    res.json({
      success: true,
      appointment: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Appointments
router.get("/doctor/:doctorId/all", authenticateToken, isDoctor, async (req, res) => {
  try {
    const { status, date, limit = 50 } = req.query;
    
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patients(name, age, gender, phone)
      `)
      .eq('doctor_id', req.params.doctorId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }
    
    if (date) {
      query = query.eq('appointment_date', date);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      appointments: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/doctor/:doctorId/today", authenticateToken, isDoctor, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patients(name, age, gender, phone, medical_history, allergies)
      `)
      .eq('doctor_id', req.params.doctorId)
      .eq('appointment_date', today)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_time');

    if (error) throw error;

    res.json({
      success: true,
      appointments: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Appointments
router.get("/patient/:patientId/all", authenticateToken, async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty, profile_picture, consultation_fee)
      `)
      .eq('patient_id', req.params.patientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      appointments: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Appointment Analytics & Reports
router.get("/analytics/overview", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Total appointments
    const { count: totalAppointments } = await supabaseAdmin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('appointment_date', start)
      .lte('appointment_date', end);

    // Appointments by status
    const { data: statusCounts } = await supabaseAdmin
      .from('appointments')
      .select('status')
      .gte('appointment_date', start)
      .lte('appointment_date', end);

    const statusBreakdown = statusCounts.reduce((acc, apt) => {
      acc[apt.status] = (acc[apt.status] || 0) + 1;
      return acc;
    }, {});

    // Daily appointment counts
    const { data: dailyCounts } = await supabaseAdmin
      .from('appointments')
      .select('appointment_date')
      .gte('appointment_date', start)
      .lte('appointment_date', end)
      .order('appointment_date');

    const dailyBreakdown = dailyCounts.reduce((acc, apt) => {
      acc[apt.appointment_date] = (acc[apt.appointment_date] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      analytics: {
        total_appointments: totalAppointments,
        status_breakdown: statusBreakdown,
        daily_breakdown: dailyBreakdown,
        date_range: { start, end }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Appointment Search & Filtering
router.get("/search/by-criteria", authenticateToken, async (req, res) => {
  try {
    const { 
      doctor_id, 
      patient_id, 
      status, 
      date_from, 
      date_to, 
      booking_reference,
      limit = 50 
    } = req.query;

    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty),
        patients(name, age)
      `)
      .limit(parseInt(limit))
      .order('appointment_date', { ascending: false });

    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (status) query = query.eq('status', status);
    if (date_from) query = query.gte('appointment_date', date_from);
    if (date_to) query = query.lte('appointment_date', date_to);
    if (booking_reference) query = query.ilike('booking_reference', `%${booking_reference}%`);

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      success: true,
      appointments: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Complete Appointment with Medical Records
router.put("/complete/:appointmentId", authenticateToken, isDoctor, async (req, res) => {
  try {
    const { diagnosis, prescription, notes, follow_up_required, follow_up_date } = req.body;

    // Update appointment
    const { data: appointment, error: aptError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'completed',
        diagnosis,
        prescription,
        notes,
        follow_up_required: follow_up_required || false,
        follow_up_date: follow_up_date || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.appointmentId)
      .select()
      .single();

    if (aptError) throw aptError;

    // Create medical record
    if (diagnosis || prescription) {
      const { error: recordError } = await supabaseAdmin
        .from('medical_records')
        .insert([{
          patient_id: appointment.patient_id,
          doctor_id: appointment.doctor_id,
          appointment_id: appointment.id,
          record_type: 'consultation',
          title: `Consultation - ${new Date(appointment.appointment_date).toLocaleDateString()}`,
          diagnosis,
          prescription,
          description: notes
        }]);

      if (recordError) 
    }

    res.json({
      success: true,
      message: "Appointment completed successfully",
      appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
