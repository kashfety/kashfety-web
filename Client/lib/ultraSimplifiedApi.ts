// ULTRA SIMPLIFIED API CLIENT - No Supabase Auth, works with unified users table
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Simple token storage
let authToken: string | null = null;
let currentUser: any = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('ultra_simple_token', token);
  } else {
    localStorage.removeItem('ultra_simple_token');
    currentUser = null;
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('ultra_simple_token');
  }
  return authToken;
};

export const setCurrentUser = (user: any) => {
  currentUser = user;
  if (user) {
    localStorage.setItem('ultra_simple_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('ultra_simple_user');
  }
};

export const getCurrentUser = (): any => {
  if (currentUser) return currentUser;
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('ultra_simple_user');
    if (stored) {
      currentUser = JSON.parse(stored);
    }
  }
  return currentUser;
};

// API client
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Ultra Simple Login
export const ultraSimpleLogin = async (email: string, password: string) => {
  try {
    console.log('=== ULTRA SIMPLE LOGIN API CALL ===');
    console.log('Email:', email);
    
    const response = await apiClient.post('/ultra-appointments/login', {
      email,
      password
    });

    console.log('Login response:', response.data);

    if (response.data.success) {
      setAuthToken(response.data.token);
      setCurrentUser(response.data.user);
      
      return {
        success: true,
        user: response.data.user,
        token: response.data.token
      };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error: any) {
    console.error('Ultra simple login error:', error);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// Ultra Simple Registration
export const ultraSimpleRegister = async (userData: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: 'patient' | 'doctor';
}) => {
  try {
    console.log('=== ULTRA SIMPLE REGISTRATION ===');
    console.log('Registration data:', userData);
    
    const response = await apiClient.post('/ultra-appointments/register', userData);

    console.log('Registration response:', response.data);

    if (response.data.success) {
      setAuthToken(response.data.token);
      setCurrentUser(response.data.user);
      
      return {
        success: true,
        user: response.data.user,
        token: response.data.token
      };
    } else {
      throw new Error(response.data.message || 'Registration failed');
    }
  } catch (error: any) {
    console.error('Registration error:', error);
    throw new Error(error.response?.data?.message || 'Registration failed');
  }
};

// Logout
export const ultraSimpleLogout = () => {
  setAuthToken(null);
  setCurrentUser(null);
  return { success: true };
};

// Get Doctors for Booking
export const getDoctors = async () => {
  try {
    console.log('=== GET DOCTORS API CALL ===');
    
    const response = await apiClient.get('/ultra-appointments/doctors');
    
    console.log('Doctors response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Get doctors error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get doctors');
  }
};

// Create Appointment
export const createAppointment = async (appointmentData: {
  doctor_user_id: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type?: string;
  notes?: string;
}) => {
  try {
    console.log('=== CREATE APPOINTMENT API CALL ===');
    console.log('Appointment data:', appointmentData);
    
    const response = await apiClient.post('/ultra-appointments/booking/create', appointmentData);
    
    console.log('Create appointment response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Create appointment error:', error);
    throw new Error(error.response?.data?.message || 'Failed to create appointment');
  }
};

// Get Patient Appointments
export const getPatientAppointments = async () => {
  try {
    console.log('=== GET PATIENT APPOINTMENTS API CALL ===');
    
    const response = await apiClient.get('/ultra-appointments/patient/appointments');
    
    console.log('Patient appointments response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Get patient appointments error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get appointments');
  }
};

// Get Doctor Appointments
export const getDoctorAppointments = async () => {
  try {
    console.log('=== GET DOCTOR APPOINTMENTS API CALL ===');
    
    const response = await apiClient.get('/ultra-appointments/doctor/appointments');
    
    console.log('Doctor appointments response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Get doctor appointments error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get doctor appointments');
  }
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!(getAuthToken() && getCurrentUser());
};

// Check user role
export const isPatient = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'patient';
};

export const isDoctor = (): boolean => {
  const user = getCurrentUser();
  return user?.role === 'doctor';
};

export default {
  ultraSimpleLogin,
  ultraSimpleRegister,
  ultraSimpleLogout,
  getDoctors,
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  getCurrentUser,
  isAuthenticated,
  isPatient,
  isDoctor,
  setAuthToken,
  getAuthToken
};
