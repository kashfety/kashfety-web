// Updated API client for unified users table (no Supabase Auth)

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Helper function to get auth token
function getAuthToken() {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

// Helper function to set auth token
function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

// Helper function to remove auth token
function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }
}

// Helper function to make authenticated requests
async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 401) {
    // Token expired or invalid
    removeAuthToken();
    window.location.href = '/login';
    throw new Error('Authentication required');
  }

  return response;
}

// ========================================
// AUTH API (Unified Users Table)
// ========================================

export interface RegisterData {
  email: string;
  password: string;
  role: 'patient' | 'doctor';
  first_name: string;
  last_name: string;
  phone?: string;
  
  // Patient-specific fields
  age?: number;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  
  // Doctor-specific fields
  specialty?: string;
  license_number?: string;
  consultation_fee?: number;
  experience_years?: number;
  education?: string;
  bio?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  first_name: string;
  last_name: string;
  phone?: string;
  
  // Patient fields
  age?: number;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  medical_history?: string;
  allergies?: string;
  current_medications?: string;
  
  // Doctor fields
  specialty?: string;
  license_number?: string;
  consultation_fee?: number;
  experience_years?: number;
  education?: string;
  bio?: string;
  availability_status?: string;
  
  created_at: string;
  updated_at: string;
}

export const authAPI = {
  // Register new user (patient or doctor)
  register: async (userData: RegisterData) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Registration failed');
    }

    // Store token and user data
    setAuthToken(data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));

    return data;
  },

  // Login user
  login: async (credentials: LoginData) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed');
    }

    // Store token and user data
    setAuthToken(data.token);
    localStorage.setItem('user_data', JSON.stringify(data.user));

    return data;
  },

  // Logout user
  logout: () => {
    removeAuthToken();
  },

  // Get current user from localStorage
  getCurrentUser: (): User | null => {
    if (typeof window !== 'undefined') {
      const userData = localStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    }
    return null;
  },

  // Check if user is authenticated
  isAuthenticated: (): boolean => {
    return !!getAuthToken();
  }
};

// ========================================
// APPOINTMENTS API (Unified Users Table)
// ========================================

export interface CreateAppointmentData {
  patient_user_id: string;
  doctor_user_id: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type?: string;
  notes?: string;
  symptoms?: string;
}

export interface Appointment {
  id: string;
  patient_user_id: string;
  doctor_user_id: string;
  appointment_date: string;
  appointment_time: string;
  duration: number;
  status: string;
  type: string;
  notes?: string;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  follow_up_required: boolean;
  follow_up_date?: string;
  booking_reference: string;
  payment_method: string;
  payment_status: string;
  consultation_fee?: number;
  created_at: string;
  updated_at: string;
  
  // Populated fields
  patient_name?: string;
  doctor_name?: string;
  patient?: User;
  doctor?: User;
}

export const appointmentsAPI = {
  // Create new appointment
  create: async (appointmentData: CreateAppointmentData) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/appointments`, {
      method: 'POST',
      body: JSON.stringify(appointmentData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to create appointment');
    }

    return data;
  },

  // Get appointments for a user
  getForUser: async (userId: string) => {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/appointments/${userId}`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch appointments');
    }

    return data.appointments;
  }
};

// ========================================
// DOCTORS API (Unified Users Table)
// ========================================

export const doctorsAPI = {
  // Get all available doctors
  getAll: async () => {
    const response = await authenticatedFetch(`${API_BASE_URL}/auth/doctors`);

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to fetch doctors');
    }

    return data.doctors;
  }
};

// ========================================
// CONVENIENCE FUNCTIONS
// ========================================

export const api = {
  auth: authAPI,
  appointments: appointmentsAPI,
  doctors: doctorsAPI
};

export default api;
