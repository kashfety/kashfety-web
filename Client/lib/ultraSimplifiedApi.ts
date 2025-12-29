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
    
    const response = await apiClient.post('/ultra-appointments/login', {
      email,
      password
    });


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
    
    const response = await apiClient.post('/ultra-appointments/register', userData);


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
    
    const response = await apiClient.get('/ultra-appointments/doctors');
    
    return response.data;
  } catch (error: any) {
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
    
    const response = await apiClient.post('/ultra-appointments/booking/create', appointmentData);
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to create appointment');
  }
};

// Get Patient Appointments
export const getPatientAppointments = async () => {
  try {
    
    const response = await apiClient.get('/ultra-appointments/patient/appointments');
    
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || 'Failed to get appointments');
  }
};

// Get Doctor Appointments
export const getDoctorAppointments = async () => {
  try {
    
    const response = await apiClient.get('/ultra-appointments/doctor/appointments');
    
    return response.data;
  } catch (error: any) {
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
