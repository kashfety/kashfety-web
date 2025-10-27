import { createClient } from '@supabase/supabase-js'

// Supabase configuration for client-side
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client for client-side operations
// This respects RLS policies and uses the anon key
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database tables mapping (for easy reference)
export const TABLES = {
  USERS: 'users',
  DOCTORS: 'doctors', 
  PATIENTS: 'patients',
  APPOINTMENTS: 'appointments',
  MEDICAL_RECORDS: 'medical_records',
  CENTERS: 'centers',
  DOCTOR_CENTERS: 'doctor_centers',
  AUDIT_LOGS: 'audit_logs'
} as const

// Auth helpers for client-side
export const clientAuthHelpers = {
  // Sign up a new user
  async signUp(email: string, password: string, metadata = {}) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
    
    if (error) throw error
    return data
  },

  // Sign in user
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    return data
  },

  // Sign out user
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  },

  // Get current session
  async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  },

  // Reset password
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
    if (error) throw error
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers for client-side
export const clientDbHelpers = {
  // Get user profile (uses server-side API to bypass RLS issues)
  async getUserProfile(uid: string) {
    return this.getUserProfileWithSession(uid, null)
  },

  // Get user profile with existing session (avoids getSession() call)
  async getUserProfileWithSession(uid: string, session: any) {
    console.log('getUserProfileWithSession called for uid:', uid)
    
    try {
      console.log('Fetching user profile from server API...')
      
      // Use provided session or try to get current session
      if (!session) {
        try {
          console.log('No session provided, getting current session...')
          const sessionResult = await supabase.auth.getSession()
          session = sessionResult.data?.session
          console.log('Session retrieved:', session ? 'Available' : 'Not available')
        } catch (sessionError) {
          console.error('Error getting session:', sessionError)
          console.log('Continuing without session...')
        }
      } else {
        console.log('Using provided session')
      }
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }
      
      // Add authorization header if we have a session
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`
        console.log('Added Authorization header to API call')
      } else {
        console.log('No access token available for API call')
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      console.log('Making API request to:', `${apiUrl}/user-management/profile/${uid}/data`)
      
      const response = await fetch(`${apiUrl}/user-management/profile/${uid}/data`, {
        method: 'GET',
        headers
      })
      
      console.log('API response received with status:', response.status)
      
      if (!response.ok) {
        console.log('Server API response not ok:', response.status, response.statusText)
        const errorText = await response.text()
        console.log('Error response body:', errorText)
        throw new Error(`Failed to fetch user profile: ${response.status}`)
      }
      
      const result = await response.json()
      console.log('Server API result:', result)
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch user profile')
      }
      
      console.log('User profile fetched successfully:', result.user)
      return result.user
      
    } catch (error) {
      console.error('Error fetching user profile from server:', error)
      throw new Error('Failed to load user profile')
    }
  },

  // Update user profile (updates correct table based on role)
  async updateUserProfile(uid: string, updates: any) {
    // First, determine which table the user is in
    const userProfile = await this.getUserProfile(uid)
    const tableName = userProfile.role === 'doctor' ? TABLES.DOCTORS : TABLES.PATIENTS
    
    const { data, error } = await supabase
      .from(tableName)
      .update(updates)
      .eq('uid', uid)
      .select()
      .single()
    
    if (error) throw error
    return data
  },

  // Get doctor profile
  async getDoctorProfile(uid: string) {
    const { data, error } = await supabase
      .from(TABLES.DOCTORS)
      .select(`
        *,
        users (
          name,
          email,
          phone
        )
      `)
      .eq('uid', uid)
      .single()
    
    if (error) throw error
    return data
  },

  // Get all doctors
  async getAllDoctors(filters: { specialty?: string; search?: string } = {}) {
    let query = supabase
      .from(TABLES.DOCTORS)
      .select(`
        id,
        uid,
        name,
        specialty,
        rating,
        profile_picture,
        bio,
        experience_years,
        consultation_fee,
        work_hours
      `)
      .order('rating', { ascending: false })
    
    if (filters.specialty) {
      query = query.ilike('specialty', `%${filters.specialty}%`)
    }
    
    if (filters.search) {
      query = query.ilike('name', `%${filters.search}%`)
    }
    
    const { data, error } = await query
    if (error) throw error
    return data
  },

  // Get patient profile
  async getPatientProfile(uid: string) {
    const { data, error } = await supabase
      .from(TABLES.PATIENTS)
      .select('*')
      .eq('uid', uid)
      .single()
    
    if (error) throw error
    return data
  },

  // Get appointments for a user
  async getUserAppointments(uid: string, role: string) {
    let query
    
    if (role === 'doctor') {
      query = supabase
        .from(TABLES.APPOINTMENTS)
        .select(`
          *,
          patients (
            name,
            email,
            phone
          )
        `)
        .eq('doctors.uid', uid)
    } else {
      query = supabase
        .from(TABLES.APPOINTMENTS)
        .select(`
          *,
          doctors (
            name,
            specialty,
            profile_picture
          )
        `)
        .eq('patients.uid', uid)
    }
    
    const { data, error } = await query.order('appointment_date', { ascending: true })
    if (error) throw error
    return data
  }
}

// Storage helpers for client-side
export const clientStorageHelpers = {
  // Upload file
  async uploadFile(bucket: string, path: string, file: File, options = {}) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, options)
    
    if (error) throw error
    return data
  },

  // Get public URL
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)
    
    return data.publicUrl
  },

  // Delete file
  async deleteFile(bucket: string, path: string) {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])
    
    if (error) throw error
  }
}

export default supabase 