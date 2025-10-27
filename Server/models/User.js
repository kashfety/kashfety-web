import { supabaseAdmin } from "../utils/supabase.js";

class User {
  static async createUser(userData) {
    // Handle name parsing if first_name/last_name not provided
    let firstName = userData.first_name;
    let lastName = userData.last_name;
    
    if (!firstName && !lastName && userData.name) {
      const nameParts = userData.name.trim().split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    // Prepare the user data for insertion with ALL possible fields
    const userInsertData = {
      uid: userData.uid,
      email: userData.email,
      name: userData.name,
      first_name: firstName || '',
      last_name: lastName || '',
      phone: userData.phone || '',
      role: userData.role || 'patient',
      default_dashboard: userData.default_dashboard,
      profile_picture: userData.profile_picture,
      gender: userData.gender,
      date_of_birth: userData.date_of_birth,
      medical_history: userData.medical_history,
      allergies: userData.allergies,
      medications: userData.medications
    };

    // Add doctor-specific fields (will be null for patients)
    if (userData.role === 'doctor') {
      userInsertData.specialty = userData.specialty;
      userInsertData.qualifications = userData.qualifications;
      userInsertData.bio = userData.bio;
      userInsertData.experience_years = userData.experience_years;
      userInsertData.consultation_fee = userData.consultation_fee;
      userInsertData.work_hours = userData.work_hours;
      userInsertData.vacation_days = userData.vacation_days;
      userInsertData.rating = userData.rating || 0.0;
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([userInsertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async findByUid(uid) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async findByEmail(email) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  static async updateUser(uid, updates) {
    const { data, error } = await supabaseAdmin
      .from('users')
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

  static async getUserDashboardData(uid) {
    // First get the user data
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('uid', uid)
      .single();

    if (userError && userError.code !== 'PGRST116') throw userError;
    if (!userData) return null;

    // Determine role if not set in users table
    let userRole = userData.role;
    if (!userRole) {
      // Check if user exists in doctors table
      const { data: doctorData } = await supabaseAdmin
        .from('doctors')
        .select('id')
        .eq('uid', uid)
        .single();
      
      if (doctorData) {
        userRole = 'doctor';
      } else {
        userRole = 'patient';
      }
    }

    // Get role-specific data
    let roleData = null;
    if (userRole === 'doctor') {
      const { data, error } = await supabaseAdmin
        .from('doctors')
        .select('*')
        .eq('uid', uid)
        .single();
      if (!error) roleData = data;
    } else if (userRole === 'patient') {
      const { data, error } = await supabaseAdmin
        .from('patients')
        .select('*')
        .eq('uid', uid)
        .single();
      if (!error) roleData = data;
    }

    return {
      ...userData,
      role: userRole, // Ensure role is always included
      profile: roleData
    };
  }

  static async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async deleteUser(uid) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('uid', uid)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export default User;
