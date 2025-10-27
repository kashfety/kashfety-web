import { supabaseAdmin } from "../utils/supabase.js";

class Doctor {
  static async createDoctorProfile(doctorData) {
    // Handle name parsing if first_name/last_name not provided
    let firstName = doctorData.first_name;
    let lastName = doctorData.last_name;
    
    if (!firstName && !lastName && doctorData.name) {
      const nameParts = doctorData.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Only include fields that exist in the doctors table based on schema
    const insertData = {
      user_id: doctorData.user_id,
      uid: doctorData.uid,
      email: doctorData.email,
      name: doctorData.name,
      phone: doctorData.phone || '',
      specialty: doctorData.specialty,
      qualifications: doctorData.qualifications || [],
      bio: doctorData.bio,
      experience_years: doctorData.experience_years,
      consultation_fee: doctorData.consultation_fee,
      profile_picture: doctorData.profile_picture,
      work_hours: doctorData.work_hours || {},
      vacation_days: doctorData.vacation_days || {},
      rating: doctorData.rating || 0.0,
      is_active: true,
      is_accepting_patients: true
    };

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getDoctorByUid(uid) {
    // Get the doctor data first
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('uid', uid)
      .single();

    if (doctorError && doctorError.code !== 'PGRST116') throw doctorError;
    if (!doctorData) return null;

    // Get related user data
    let userData = null;
    if (doctorData.user_id) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', doctorData.user_id)
        .single();
      userData = data;
    }

    return {
      ...doctorData,
      user: userData
    };
  }

  static async getDoctorById(id) {
    // Get the doctor data first
    const { data: doctorData, error: doctorError } = await supabaseAdmin
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();

    if (doctorError && doctorError.code !== 'PGRST116') throw doctorError;
    if (!doctorData) return null;

    // Get related user data
    let userData = null;
    if (doctorData.user_id) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', doctorData.user_id)
        .single();
      userData = data;
    }

    // Get affiliated centers
    const { data: doctorCenters } = await supabaseAdmin
      .from('doctor_centers')
      .select(`
        *,
        centers!doctor_centers_center_id_fkey(*)
      `)
      .eq('doctor_id', doctorData.id);

    return {
      ...doctorData,
      user: userData,
      doctor_centers: doctorCenters || []
    };
  }

  static async getAllActiveDoctors() {
    const { data, error } = await supabaseAdmin
      .from('doctors')
      .select(`
        *,
        users(name, email, profile_picture),
        doctor_centers(centers(name, address))
      `)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async getDoctorsBySpecialty(specialty) {
    const { data, error } = await supabaseAdmin
      .from('doctors')
      .select(`
        *,
        users(name, profile_picture),
        doctor_centers(centers(*))
      `)
      .eq('specialty', specialty)
      .order('name');

    if (error) throw error;
    return data;
  }

  static async updateDoctorProfile(uid, updates) {
    const { data, error } = await supabaseAdmin
      .from('doctors')
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

  static async getDoctorAvailability(doctorId, startDate, endDate) {
    const { data, error } = await supabaseAdmin
      .from('doctor_availability')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');

    if (error) throw error;
    return data;
  }

  static async updateDoctorAvailability(doctorId, availabilityData) {
    const { data, error } = await supabaseAdmin
      .from('doctor_availability')
      .upsert(availabilityData)
      .select();

    if (error) throw error;
    return data;
  }

  static async getDoctorAppointments(doctorId, status = null) {
    let query = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patients(name, age, gender, phone),
        doctor_id
      `)
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  }
}

export default Doctor;
