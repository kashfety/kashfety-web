import { supabaseAdmin, TABLES, dbHelpers } from "../utils/supabase.js";

// Get patient profile
export const getPatientProfile = async (req, res) => {
  try {
    // Use authenticated user's UID instead of URL parameter for security
    const patientUid = req.authenticatedPatientUid || req.user.uid;

    const { data: patient, error } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('*')
      .eq('uid', patientUid)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch patient profile',
      error: error.message
    });
  }
};

// Update patient profile
export const updatePatientProfile = async (req, res) => {
  try {
    // Use authenticated user's UID instead of URL parameter for security
    const patientUid = req.authenticatedPatientUid || req.user.uid;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.uid;
    delete updateData.created_at;
    delete updateData.updated_at;

    // Update patient data
    const { data: patient, error } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .update(updateData)
      .eq('uid', patientUid)
      .select()
      .single();

    if (error) throw error;

    // Log activity
    await dbHelpers.logActivity(
      patient.id,
      'UPDATE',
      'patient_profile',
      patient.id,
      null,
      updateData
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
      error: error.message
    });
  }
};

// Get patient medical records
export const getPatientMedicalRecords = async (req, res) => {
  try {
    // Use authenticated user's UID instead of URL parameter for security
    const patientUid = req.authenticatedPatientUid || req.user.uid;

    // Get patient ID from UID
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('id')
      .eq('uid', patientUid)
      .single();

    if (patientError) throw patientError;

    const { data: records, error } = await supabaseAdmin
      .from(TABLES.MEDICAL_RECORDS)
      .select(`
        *,
        doctor:doctors(id, name, specialty),
        appointment:appointments(id, appointment_date, type, status)
      `)
      .eq('patient_id', patient.id)
      .order('record_date', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch medical records',
      error: error.message
    });
  }
};

// Create medical record
export const createMedicalRecord = async (req, res) => {
  try {
    const { patientId } = req.params; // Still needed for doctors to specify which patient
    const {
      doctor_id,
      appointment_id,
      record_type,
      title,
      description,
      diagnosis,
      treatment,
      prescription,
      lab_results,
      attachments
    } = req.body;

    // Security check: Verify doctor can access this patient's data
    if (req.user.role === 'doctor') {
      // For doctors, verify they have permission to access this patient
      // This would be checked through appointments or assigned patients
      const { data: appointmentCheck } = await supabaseAdmin
        .from(TABLES.APPOINTMENTS)
        .select('id')
        .eq('doctor_id', req.user.id)
        .eq('patient_id', (await supabaseAdmin
          .from(TABLES.PATIENTS)
          .select('id')
          .eq('uid', patientId)
          .single()).data?.id)
        .limit(1);

      if (!appointmentCheck || appointmentCheck.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only create records for your patients.'
        });
      }
    }

    // Get patient ID from UID
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('id')
      .eq('uid', patientId)
      .single();

    if (patientError) throw patientError;

    const { data: record, error } = await supabaseAdmin
      .from(TABLES.MEDICAL_RECORDS)
      .insert({
        patient_id: patient.id,
        doctor_id,
        appointment_id,
        record_type: record_type || 'consultation',
        title,
        description,
        diagnosis,
        treatment,
        prescription,
        lab_results,
        attachments: attachments || []
      })
      .select(`
        *,
        doctor:doctors(id, name, specialty),
        appointment:appointments(id, appointment_date, type)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create medical record',
      error: error.message
    });
  }
};

// Update medical record
export const updateMedicalRecord = async (req, res) => {
  try {
    const { recordId } = req.params;
    const updateData = req.body;

    const { data: record, error } = await supabaseAdmin
      .from(TABLES.MEDICAL_RECORDS)
      .update(updateData)
      .eq('id', recordId)
      .select(`
        *,
        doctor:doctors(id, name, specialty),
        appointment:appointments(id, appointment_date, type)
      `)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Medical record updated successfully',
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update medical record',
      error: error.message
    });
  }
};

// Get patient appointment history
export const getPatientAppointmentHistory = async (req, res) => {
  try {
    // Use authenticated user's UID instead of URL parameter for security
    const patientUid = req.authenticatedPatientUid || req.user.uid;
    const { status, type, from_date, to_date } = req.query;

    // Get patient ID from UID
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('id')
      .eq('uid', patientUid)
      .single();

    if (patientError) throw patientError;

    let query = supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctors(id, name, specialty, consultation_fee),
        medical_record:medical_records(id, diagnosis, prescription, lab_results)
      `)
      .eq('patient_id', patient.id);

    if (status) query = query.eq('status', status);
    if (type) query = query.eq('type', type);
    if (from_date) query = query.gte('appointment_date', from_date);
    if (to_date) query = query.lte('appointment_date', to_date);

    const { data: appointments, error } = await query
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment history',
      error: error.message
    });
  }
};

// Get patient dashboard data
export const getPatientDashboard = async (req, res) => {
  try {
    // Use authenticated user's UID instead of URL parameter for security
    const patientUid = req.authenticatedPatientUid || req.user.uid;

    // Get patient ID from UID
    const { data: patient, error: patientError } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('id, name, age, gender, medical_history, allergies, medications')
      .eq('uid', patientUid)
      .single();

    if (patientError) throw patientError;

    // Get upcoming appointments
    const { data: upcomingAppointments, error: upcomingError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select(`
        *,
        doctor:doctors(id, name, specialty)
      `)
      .eq('patient_id', patient.id)
      .gte('appointment_date', new Date().toISOString().split('T')[0])
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .limit(5);

    if (upcomingError) throw upcomingError;

    // Get recent medical records
    const { data: recentRecords, error: recordsError } = await supabaseAdmin
      .from(TABLES.MEDICAL_RECORDS)
      .select(`
        *,
        doctor:doctors(id, name, specialty)
      `)
      .eq('patient_id', patient.id)
      .order('record_date', { ascending: false })
      .limit(5);

    if (recordsError) throw recordsError;

    // Get appointment statistics
    const { data: appointmentStats, error: statsError } = await supabaseAdmin
      .rpc('get_patient_appointment_stats', { p_patient_id: patient.id });

    if (statsError) throw statsError;

    // Get health summary
    const healthSummary = {
      totalAppointments: appointmentStats?.[0]?.total_appointments || 0,
      completedAppointments: appointmentStats?.[0]?.completed_appointments || 0,
      upcomingAppointments: upcomingAppointments.length,
      medicalRecords: recentRecords.length,
      lastVisit: recentRecords[0]?.record_date || null,
      chronicConditions: patient.medical_history?.length || 0,
      allergies: patient.allergies?.length || 0,
      medications: patient.medications?.length || 0
    };

    res.json({
      success: true,
      data: {
        patient,
        upcomingAppointments,
        recentRecords,
        healthSummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
      error: error.message
    });
  }
};

// Update emergency contact
export const updateEmergencyContact = async (req, res) => {
  try {
    // Use authenticated user's UID instead of URL parameter for security
    const patientUid = req.authenticatedPatientUid || req.user.uid;
    const { emergency_contact } = req.body;

    const { data: patient, error } = await supabaseAdmin
      .from(TABLES.PATIENTS)
      .update({ emergency_contact })
      .eq('uid', patientUid)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Emergency contact updated successfully',
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update emergency contact',
      error: error.message
    });
  }
};

// Search patients (for doctors and admins)
export const searchPatients = async (req, res) => {
  try {
    const { query: searchQuery, age_min, age_max, gender } = req.query;

    let query = supabaseAdmin
      .from(TABLES.PATIENTS)
      .select('id, uid, name, email, age, gender, created_at');

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%, email.ilike.%${searchQuery}%`);
    }

    if (age_min) query = query.gte('age', age_min);
    if (age_max) query = query.lte('age', age_max);
    if (gender) query = query.eq('gender', gender);

    const { data: patients, error } = await query
      .order('name', { ascending: true })
      .limit(50);

    if (error) throw error;

    res.json({
      success: true,
      data: patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search patients',
      error: error.message
    });
  }
}; 