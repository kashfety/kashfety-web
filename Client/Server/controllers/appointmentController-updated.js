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
      console.error('❌ Patient not found:', patientError);
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
      console.error('❌ Doctor not found:', doctorError);
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
      console.error('❌ Error creating appointment:', insertError);
      throw insertError;
    }

    console.log('✅ Appointment created successfully:', newAppointment.id);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: newAppointment,
      doctor: doctor,
      patient: patient
    });

  } catch (error) {
    console.error('❌ Appointment booking error:', error);
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
    console.error('❌ Home visit booking error:', error);
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
    console.error('❌ Get patient appointments error:', error);
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
    console.error('❌ Get doctor appointments error:', error);
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
    console.error('❌ Update appointment status error:', error);
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
    console.error('❌ Reschedule appointment error:', error);
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
    console.error('❌ Cancel appointment error:', error);
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
    console.error('❌ Get appointment by ID error:', error);
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
    console.error('❌ Medical test booking error:', error);
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
    console.error('❌ Get appointment stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get appointment statistics',
      details: error.message
    });
  }
};
