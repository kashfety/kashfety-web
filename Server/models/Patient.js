import { supabaseAdmin } from "../utils/supabase.js";

class Patient {
  static async createPatientProfile(patientData) {
    // Handle name parsing if first_name/last_name not provided
    let firstName = patientData.first_name;
    let lastName = patientData.last_name;
    
    if (!firstName && !lastName && patientData.name) {
      const nameParts = patientData.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Duplicate ALL user data in the patients table (same structure as users)
    const insertData = {
      user_id: patientData.user_id,
      uid: patientData.uid,
      email: patientData.email,
      name: patientData.name,
      first_name: firstName || '',
      last_name: lastName || '',
      phone: patientData.phone || '',
      gender: patientData.gender,
      date_of_birth: patientData.date_of_birth,
      medical_history: patientData.medical_history,
      allergies: patientData.allergies,
      medications: patientData.medications
    };

    const { data, error } = await supabaseAdmin
      .from('patients')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getPatientByUid(uid) {
    // Get the patient data first
    const { data: patientData, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('uid', uid)
      .single();

    if (patientError && patientError.code !== 'PGRST116') throw patientError;
    if (!patientData) return null;

    // Get related user data
    let userData = null;
    if (patientData.user_id) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', patientData.user_id)
        .single();
      userData = data;
    }

    // Get appointments (simplified query)
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors!appointments_doctor_id_fkey(name, specialty)
      `)
      .eq('patient_id', patientData.id);

    // Get medical records (simplified query)
    const { data: medicalRecords } = await supabaseAdmin
      .from('medical_records')
      .select(`
        *,
        doctors!medical_records_doctor_id_fkey(name)
      `)
      .eq('patient_id', patientData.id);

    return {
      ...patientData,
      user: userData,
      appointments: appointments || [],
      medical_records: medicalRecords || []
    };
  }

  static async getPatientById(id) {
    // Get the patient data first
    const { data: patientData, error: patientError } = await supabaseAdmin
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (patientError && patientError.code !== 'PGRST116') throw patientError;
    if (!patientData) return null;

    // Get related user data
    let userData = null;
    if (patientData.user_id) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', patientData.user_id)
        .single();
      userData = data;
    }

    // Get appointments (simplified query)
    const { data: appointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors!appointments_doctor_id_fkey(name, specialty)
      `)
      .eq('patient_id', patientData.id);

    // Get medical records (simplified query)
    const { data: medicalRecords } = await supabaseAdmin
      .from('medical_records')
      .select(`
        *,
        doctors!medical_records_doctor_id_fkey(name)
      `)
      .eq('patient_id', patientData.id);

    return {
      ...patientData,
      user: userData,
      appointments: appointments || [],
      medical_records: medicalRecords || []
    };
  }

  static async updatePatientProfile(uid, updates) {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getPatientMedicalHistory(uid) {
    const { data, error } = await supabaseAdmin
      .from('medical_records')
      .select(`
        *,
        doctors(name, specialty),
        appointments(appointment_date, appointment_time)
      `)
      .eq('patients.uid', uid)
      .order('record_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getPatientAppointments(patientId, status = null) {
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty, profile_picture, consultation_fee)
      `)
      .eq('patient_id', patientId)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }

  static async getAllPatients() {
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select(`
        *,
        users(name, email, phone),
        appointments(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }
}

export default Patient;
