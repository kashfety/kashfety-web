// Updated Appointment Controller to work with unified schema
// This works with the fixed schema where all foreign keys point to the users table

import { supabaseAdmin, TABLES } from "../utils/supabase.js";

// Book a regular appointment
export const bookAppointment = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      duration = 30,
      type = 'consultation',
      appointment_type = 'clinic',
      notes = '',
      symptoms = ''
    } = req.body;

    console.log('📋 Booking appointment with unified schema:', {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      type,
      appointment_type
    });

    // Enhanced logging for debugging
    // Validate required fields
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patient_id, doctor_id, appointment_date, appointment_time'
      });
    }

    // Verify patient exists in unified users table
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name, role')
      .eq('id', patient_id)
      .eq('role', 'patient')
      .single();

    if (patientError || !patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found in unified users table'
      });
    }

    // Verify doctor exists in unified users table
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name, role, specialty, consultation_fee')
      .eq('id', doctor_id)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found in unified users table'
      });
    }

    // Check for scheduling conflicts
    const { data: existingAppointment, error: conflictError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .neq('status', 'cancelled')
      .single();

    if (conflictError && conflictError.code !== 'PGRST116') {
      throw conflictError;
    }

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: 'Doctor already has an appointment at this time'
      });
    }

    // Create the appointment
    const appointmentData = {
      patient_id,
      doctor_id,
      appointment_date,
      appointment_time,
      duration,
      type,
      appointment_type,
      status: 'scheduled',
      notes,
      symptoms,
      consultation_fee: doctor.consultation_fee,
      payment_status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newAppointment, error: insertError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .insert(appointmentData)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty,
          phone,
          email
        ),
        patient:patient_id (
          id,
          name,
          phone,
          email
        )
      `)
      .single();

    if (insertError) {
      throw insertError;
    }


    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: newAppointment,
      doctor: doctor,
      patient: patient
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to book appointment',
      details: error.message
    });
  }
};

// Book a home visit appointment
export const bookHomeVisit = async (req, res) => {
  try {
    const appointmentData = {
      ...req.body,
      appointment_type: 'home',
      type: req.body.type || 'consultation'
    };

    // Use the regular booking function with home visit type
    req.body = appointmentData;
    return await bookAppointment(req, res);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to book home visit',
      details: error.message
    });
  }
};

// Get patient appointments
export const getPatientAppointments = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, limit = 50 } = req.query;

    // Verify patient exists in unified users table
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name, role')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (patientError || !patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient not found'
      });
    }

    // Build query
    let query = supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty,
          phone,
          email,
          rating
        )
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
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
    res.status(500).json({
      success: false,
      error: 'Failed to get appointments',
      details: error.message
    });
  }
};

// Get doctor appointments
export const getDoctorAppointments = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { status, date, limit = 50 } = req.query;

    // Verify doctor exists in unified users table
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name, role')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Build query
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
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(limit);

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
    res.status(500).json({
      success: false,
      error: 'Failed to get appointments',
      details: error.message
    });
  }
};

// Update appointment status
export const updateAppointmentStatus = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
      });
    }

    // Update appointment
    const { data: updatedAppointment, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    if (!updatedAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment status updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update appointment status',
      details: error.message
    });
  }
};

// Reschedule appointment
export const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { appointment_date, appointment_time, reason } = req.body;

    if (!appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: appointment_date, appointment_time'
      });
    }

    // Get current appointment
    const { data: currentAppointment, error: getError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (getError || !currentAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check for scheduling conflicts
    const { data: conflictingAppointment, error: conflictError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('id')
      .eq('doctor_id', currentAppointment.doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .neq('status', 'cancelled')
      .neq('id', appointmentId)
      .single();

    if (conflictError && conflictError.code !== 'PGRST116') {
      throw conflictError;
    }

    if (conflictingAppointment) {
      return res.status(409).json({
        success: false,
        error: 'Doctor already has an appointment at this time'
      });
    }

    // Update appointment
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .update({
        appointment_date,
        appointment_time,
        notes: reason ? `Rescheduled: ${reason}` : currentAppointment.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reschedule appointment',
      details: error.message
    });
  }
};

// Cancel appointment
export const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;

    // First, fetch the appointment to check timing
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('id, status, appointment_date, appointment_time')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: 'Appointment is already cancelled'
      });
    }

    // Check if cancellation is within 24 hours of appointment time
    if (appointment.appointment_date && appointment.appointment_time) {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if appointment is in the past
      if (hoursUntilAppointment < 0) {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel a past appointment',
          code: 'APPOINTMENT_IN_PAST'
        });
      }

      // Block cancellation if less than 24 hours away
      if (hoursUntilAppointment < 24) {
        return res.status(400).json({
          success: false,
          error: 'Cannot cancel appointment within 24 hours of the scheduled time. Please contact support for assistance.',
          code: 'CANCELLATION_TOO_LATE'
        });
      }
    }

    // Update appointment status to cancelled
    const { data: cancelledAppointment, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .update({
        status: 'cancelled',
        notes: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone
        )
      `)
      .single();

    if (error) {
      throw error;
    }

    if (!cancelledAppointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: cancelledAppointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to cancel appointment',
      details: error.message
    });
  }
};

// Get appointment by ID
export const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const { data: appointment, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty,
          phone,
          email,
          rating
        ),
        patient:patient_id (
          id,
          name,
          phone,
          email,
          date_of_birth
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (error) {
      throw error;
    }

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    res.status(200).json({
      success: true,
      appointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get appointment',
      details: error.message
    });
  }
};

// Book medical test appointment
export const bookMedicalTest = async (req, res) => {
  try {
    const appointmentData = {
      ...req.body,
      type: 'routine', // Medical tests are typically routine appointments
      appointment_type: req.body.appointment_type || 'clinic'
    };

    // Use the regular booking function
    req.body = appointmentData;
    return await bookAppointment(req, res);

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to book medical test',
      details: error.message
    });
  }
};

// Get appointment statistics
export const getAppointmentStats = async (req, res) => {
  try {
    const { doctorId, patientId, startDate, endDate } = req.query;

    let query = supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('status, appointment_date, type, appointment_type');

    if (doctorId) {
      // Verify doctor exists
      const { data: doctor, error: doctorError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('id')
        .eq('id', doctorId)
        .eq('role', 'doctor')
        .single();

      if (doctorError || !doctor) {
        return res.status(404).json({
          success: false,
          error: 'Doctor not found'
        });
      }

      query = query.eq('doctor_id', doctorId);
    }

    if (patientId) {
      // Verify patient exists
      const { data: patient, error: patientError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('id')
        .eq('id', patientId)
        .eq('role', 'patient')
        .single();

      if (patientError || !patient) {
        return res.status(404).json({
          success: false,
          error: 'Patient not found'
        });
      }

      query = query.eq('patient_id', patientId);
    }

    if (startDate) {
      query = query.gte('appointment_date', startDate);
    }

    if (endDate) {
      query = query.lte('appointment_date', endDate);
    }

    const { data: appointments, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics
    const stats = {
      total: appointments.length,
      scheduled: appointments.filter(a => a.status === 'scheduled').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      cancelled: appointments.filter(a => a.status === 'cancelled').length,
      no_show: appointments.filter(a => a.status === 'no_show').length,

      // By type
      consultation: appointments.filter(a => a.type === 'consultation').length,
      follow_up: appointments.filter(a => a.type === 'follow_up').length,
      emergency: appointments.filter(a => a.type === 'emergency').length,
      routine: appointments.filter(a => a.type === 'routine').length,

      // By appointment type
      clinic: appointments.filter(a => a.appointment_type === 'clinic').length,
      home: appointments.filter(a => a.appointment_type === 'home').length
    };

    res.status(200).json({
      success: true,
      stats,
      period: {
        startDate: startDate || 'all time',
        endDate: endDate || 'all time'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get appointment statistics',
      details: error.message
    });
  }
};

// Confirm appointment (doctor confirms pending appointment)
export const confirmAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const doctorUid = req.user?.uid;


    // Verify appointment exists and belongs to this doctor
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id!inner (
          id,
          uid,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone,
          email
        )
      `)
      .eq('id', appointmentId)
      .eq('doctor.uid', doctorUid)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or you do not have permission to confirm it'
      });
    }

    if (appointment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: `Cannot confirm appointment with status: ${appointment.status}`
      });
    }

    // Update appointment status to confirmed
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }


    res.status(200).json({
      success: true,
      message: 'Appointment confirmed successfully',
      data: updatedAppointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to confirm appointment',
      details: error.message
    });
  }
};

// Complete appointment (doctor marks appointment as completed)
export const completeAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { notes, diagnosis, prescription } = req.body;
    const doctorUid = req.user?.uid;


    // Verify appointment exists and belongs to this doctor
    const { data: appointment, error: fetchError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id!inner (
          id,
          uid,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone,
          email
        )
      `)
      .eq('id', appointmentId)
      .eq('doctor.uid', doctorUid)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found or you do not have permission to complete it'
      });
    }

    if (!['confirmed', 'in-progress'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot complete appointment with status: ${appointment.status}`
      });
    }

    // Update appointment status to completed
    const { data: updatedAppointment, error: updateError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .update({
        status: 'completed',
        notes: notes || appointment.notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty
        ),
        patient:patient_id (
          id,
          name,
          phone
        )
      `)
      .single();

    if (updateError) {
      throw updateError;
    }

    // Create medical record if diagnosis or prescription provided
    if (diagnosis || prescription) {
      const { error: medicalRecordError } = await supabaseAdmin
        .from(TABLES.MEDICAL_RECORDS)
        .insert({
          appointment_id: appointmentId,
          doctor_id: appointment.doctor_id,
          patient_id: appointment.patient_id,
          diagnosis: diagnosis || '',
          prescription: prescription || '',
          notes: notes || '',
          created_at: new Date().toISOString()
        });

      if (medicalRecordError) {
        // Don't fail the completion, just log the error
      }
    }


    res.status(200).json({
      success: true,
      message: 'Appointment completed successfully',
      data: updatedAppointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to complete appointment',
      details: error.message
    });
  }
};

// Get patient medical tests
export const getPatientMedicalTests = async (req, res) => {
  try {
    const { patientId } = req.params;
    const userUid = req.user?.uid;


    // Verify the user has access to this patient's data
    // Either the user is the patient themselves, or a doctor who has seen this patient
    const { data: userData, error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, role')
      .eq('uid', userUid)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // If user is a patient, they can only see their own tests
    if (userData.role === 'patient' && userData.id !== patientId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // If user is a doctor, verify they have appointments with this patient
    if (userData.role === 'doctor') {
      const { data: appointmentCheck, error: appointmentError } = await supabaseAdmin
        .from(TABLES.APPOINTMENTS)
        .select('id')
        .eq('doctor_id', userData.id)
        .eq('patient_id', patientId)
        .limit(1);

      if (appointmentError || !appointmentCheck || appointmentCheck.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied - no appointment history with this patient'
        });
      }
    }

    // Get medical test appointments for this patient
    const { data: medicalTests, error: testsError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty
        ),
        center:center_id (
          id,
          name,
          address
        )
      `)
      .eq('patient_id', patientId)
      .eq('type', 'medical_test')
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (testsError) {
      throw testsError;
    }


    res.status(200).json({
      success: true,
      data: medicalTests || []
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get patient medical tests',
      details: error.message
    });
  }
};

// Get appointment details by ID
export const getAppointmentDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userUid = req.user?.uid;


    // Get user info to determine access rights
    const { data: userData, error: userError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, role')
      .eq('uid', userUid)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get appointment with full details
    const { data: appointment, error: appointmentError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id (
          id,
          name,
          specialty,
          phone,
          email,
          consultation_fee
        ),
        patient:patient_id (
          id,
          name,
          phone,
          email,
          date_of_birth,
          medical_history,
          allergies
        ),
        center:center_id (
          id,
          name,
          address,
          phone
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return res.status(404).json({
        success: false,
        error: 'Appointment not found'
      });
    }

    // Check access permissions
    const hasAccess =
      (userData.role === 'doctor' && appointment.doctor_id === userData.id) ||
      (userData.role === 'patient' && appointment.patient_id === userData.id) ||
      (userData.role === 'admin');

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }


    res.status(200).json({
      success: true,
      data: appointment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get appointment details',
      details: error.message
    });
  }
};

// Get available time slots for a doctor
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;


    if (!date) {
      return res.status(400).json({
        success: false,
        error: 'Date parameter is required'
      });
    }

    // Get doctor's work hours
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, name, work_hours, vacation_days')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (doctorError || !doctor) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Check if doctor is on vacation
    const queryDate = new Date(date);
    const vacationDays = doctor.vacation_days || [];
    const isVacationDay = vacationDays.some(vacationDate => {
      const vacation = new Date(vacationDate);
      return vacation.toDateString() === queryDate.toDateString();
    });

    if (isVacationDay) {
      return res.status(200).json({
        success: true,
        data: {
          availableSlots: [],
          message: 'Doctor is on vacation this day'
        }
      });
    }

    // Get existing appointments for this doctor on this date
    const { data: existingAppointments, error: appointmentsError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('appointment_time, duration, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed', 'in-progress']);

    if (appointmentsError) {
      throw appointmentsError;
    }

    // Default work hours if not set
    const workHours = doctor.work_hours || {
      start: '09:00',
      end: '17:00',
      break_start: '12:00',
      break_end: '13:00'
    };

    // Generate all possible time slots (30-minute intervals)
    const generateTimeSlots = (start, end, breakStart = null, breakEnd = null) => {
      const slots = [];
      const startTime = new Date(`2000-01-01T${start}:00`);
      const endTime = new Date(`2000-01-01T${end}:00`);
      const breakStartTime = breakStart ? new Date(`2000-01-01T${breakStart}:00`) : null;
      const breakEndTime = breakEnd ? new Date(`2000-01-01T${breakEnd}:00`) : null;

      let currentTime = new Date(startTime);

      while (currentTime < endTime) {
        const timeString = currentTime.toTimeString().slice(0, 5);

        // Skip break time slots
        const skipDueToBreak = breakStartTime && breakEndTime &&
          currentTime >= breakStartTime && currentTime < breakEndTime;

        if (!skipDueToBreak) {
          slots.push(timeString);
        }

        currentTime.setMinutes(currentTime.getMinutes() + 30);
      }

      return slots;
    };

    const allSlots = generateTimeSlots(
      workHours.start,
      workHours.end,
      workHours.break_start,
      workHours.break_end
    );

    // Filter out booked slots
    const bookedTimes = existingAppointments.map(apt => apt.appointment_time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));


    res.status(200).json({
      success: true,
      data: {
        doctorId,
        doctorName: doctor.name,
        date,
        availableSlots,
        workHours,
        bookedSlots: bookedTimes
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get available slots',
      details: error.message
    });
  }
};

// Get all appointments (Admin only)
export const getAllAppointments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, doctorId, patientId, dateFrom, dateTo } = req.query;

    let query = supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctor_id(id, name, email, specialization),
        patient:patient_id(id, name, email, date_of_birth)
      `);

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    if (dateFrom) {
      query = query.gte('appointment_date', dateFrom);
    }

    if (dateTo) {
      query = query.lte('appointment_date', dateTo);
    }

    // Add pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    // Order by most recent first
    query = query.order('created_at', { ascending: false });

    const { data: appointments, error, count } = await query;

    if (error) {
      throw error;
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('*', { count: 'exact', head: true });

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
    }

    if (doctorId) {
      countQuery = countQuery.eq('doctor_id', doctorId);
    }

    if (patientId) {
      countQuery = countQuery.eq('patient_id', patientId);
    }

    if (dateFrom) {
      countQuery = countQuery.gte('appointment_date', dateFrom);
    }

    if (dateTo) {
      countQuery = countQuery.lte('appointment_date', dateTo);
    }

    const { count: totalCount, error: countError } = await countQuery;

    if (countError) {
      throw countError;
    }


    res.status(200).json({
      success: true,
      data: {
        appointments: appointments || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / parseInt(limit))
        },
        filters: {
          status,
          doctorId,
          patientId,
          dateFrom,
          dateTo
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get all appointments',
      details: error.message
    });
  }
};
