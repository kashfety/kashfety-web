// SIMPLIFIED API CLIENT - No Supabase Auth dependencies
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Simple token storage
let authToken: string | null = null;

export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    localStorage.setItem('simple_auth_token', token);
  } else {
    localStorage.removeItem('simple_auth_token');
  }
};

export const getAuthToken = (): string | null => {
  if (authToken) return authToken;
  if (typeof window !== 'undefined') {
    authToken = localStorage.getItem('simple_auth_token');
  }
  return authToken;
};

// API client with simplified auth
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

// Simple login function
export const simpleLogin = async (email: string, password: string) => {
  try {
    console.log('Attempting simple login for:', email);
    
    const response = await apiClient.post('/appointment-management/simple-login', {
      email,
      password
    });

    console.log('Simple login response:', response.data);

    if (response.data.success) {
      setAuthToken(response.data.token);
      return {
        success: true,
        user: response.data.user,
        token: response.data.token
      };
    } else {
      throw new Error(response.data.message || 'Login failed');
    }
  } catch (error: any) {
    console.error('Simple login error:', error);
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};

// Simple logout function
export const simpleLogout = () => {
  setAuthToken(null);
  return { success: true };
};

// Get current user (from token)
export const getCurrentUser = () => {
  const token = getAuthToken();
  if (!token) return null;

  // Extract user info from token
  if (token.startsWith('simple-patient-')) {
    const userId = token.replace('simple-patient-', '');
    return {
      id: `simple-user-${userId}`,
      email: userId === '1' ? 'qora@gmail.com' : 'sora@gmail.com',
      role: 'patient',
      name: 'qora alis'
    };
  }
  
  return null;
};

// Create appointment (simplified)
export const createAppointment = async (appointmentData: any) => {
  try {
    console.log('Creating appointment with simplified API:', appointmentData);
    
    const response = await apiClient.post('/appointment-management/booking/create', appointmentData);
    
    console.log('Appointment creation response:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('Create appointment error:', error);
    throw new Error(error.response?.data?.message || 'Failed to create appointment');
  }
};

// Get patient appointments
export const getPatientAppointments = async () => {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const response = await apiClient.get(`/appointment-management/patient/${user.id}`);
    return response.data;
  } catch (error: any) {
    console.error('Get appointments error:', error);
    throw new Error(error.response?.data?.message || 'Failed to get appointments');
  }
};

// Get doctors (existing)
export const getDoctors = async () => {
  try {
    const response = await apiClient.get('/doctors');
    return response.data;
  } catch (error) {
    console.error('Get doctors error:', error);
    throw new Error('Failed to get doctors');
  }
};

export default {
  simpleLogin,
  simpleLogout,
  getCurrentUser,
  createAppointment,
  getPatientAppointments,
  getDoctors,
  setAuthToken,
  getAuthToken
};
