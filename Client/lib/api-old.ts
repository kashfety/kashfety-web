import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { clientAuthHelpers } from './supabase';

// API Base URL - use environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config) => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      try {
        // Get current session from Supabase
        const session = await clientAuthHelpers.getCurrentSession();
        if (session?.access_token && config.headers) {
          config.headers.Authorization = `Bearer ${session.access_token}`;
        }
      } catch (error) {
        console.error('Error getting auth token:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Handle specific error codes
    if (error.response) {
      const status = error.response.status;
      
      // Handle auth errors
      if (status === 401) {
        // Only run on client-side
        if (typeof window !== 'undefined') {
          try {
            await clientAuthHelpers.signOut();
            console.error('Authentication failed. Redirecting to login.');
            window.location.href = '/login';
          } catch (signOutError) {
            console.error('Error signing out:', signOutError);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Comprehensive API endpoint definitions
const ENDPOINTS = {
  // User Management endpoints
  USER_MANAGEMENT: {
    CREATE_ACCOUNT: '/user-management/account/create',
    LOGIN: '/user-management/authentication/login',
    LOGOUT: '/user-management/authentication/logout',
    PASSWORD_RESET: '/user-management/authentication/password-reset',
    PROFILE_DATA: (uid: string) => `/user-management/profile/${uid}/data`,
    PROFILE_UPDATE: (uid: string) => `/user-management/profile/${uid}/update`,
    ROLE_UPDATE: (uid: string) => `/user-management/profile/${uid}/role`,
    DELETE_ACCOUNT: (uid: string) => `/user-management/account/${uid}/delete`,
    ALL_USERS: '/user-management/directory/all-users',
  },
  
  // Doctor Management endpoints
  DOCTOR_MANAGEMENT: {
    CREATE_PROFILE: '/doctor-management/profile/create',
    PROFILE_DETAILS: (uid: string) => `/doctor-management/profile/${uid}/details`,
    PROFILE_UPDATE: (uid: string) => `/doctor-management/profile/${uid}/update`,
    ALL_ACTIVE: '/doctor-management/directory/all-active',
    BY_SPECIALTY: (specialty: string) => `/doctor-management/directory/by-specialty/${specialty}`,
    AVAILABILITY_SCHEDULE: (doctorId: string) => `/doctor-management/availability/${doctorId}/schedule`,
    AVAILABILITY_UPDATE: (doctorId: string) => `/doctor-management/availability/${doctorId}/update`,
    APPOINTMENTS_ALL: (doctorId: string) => `/doctor-management/appointments/${doctorId}/all`,
    APPOINTMENTS_TODAY: (doctorId: string) => `/doctor-management/appointments/${doctorId}/today`,
    WORKING_HOURS: (doctorId: string) => `/doctor-management/schedule/${doctorId}/working-hours`,
    REVIEWS: (doctorId: string) => `/doctor-management/reviews/${doctorId}/all`,
    AFFILIATED_CENTERS: (doctorId: string) => `/doctor-management/centers/${doctorId}/affiliated`,
    AFFILIATE_CENTER: (doctorId: string) => `/doctor-management/centers/${doctorId}/affiliate`,
  },
  
  // Patient Management endpoints
  PATIENT_MANAGEMENT: {
    CREATE_PROFILE: '/patient-management/profile/create',
    PROFILE_DETAILS: (uid: string) => `/patient-management/profile/${uid}/details`,
    PROFILE_UPDATE: (uid: string) => `/patient-management/profile/${uid}/update`,
    MEDICAL_HISTORY: (uid: string) => `/patient-management/medical-history/${uid}/records`,
    ADD_MEDICAL_RECORD: (patientId: string) => `/patient-management/medical-history/${patientId}/add-record`,
    APPOINTMENTS_ALL: (patientId: string) => `/patient-management/appointments/${patientId}/all`,
    APPOINTMENTS_UPCOMING: (patientId: string) => `/patient-management/appointments/${patientId}/upcoming`,
    APPOINTMENTS_HISTORY: (patientId: string) => `/patient-management/appointments/${patientId}/history`,
    DASHBOARD_OVERVIEW: '/patient-management/dashboard',
    CREATE_REVIEW: (patientId: string) => `/patient-management/reviews/${patientId}/create`,
    ALL_PATIENTS: '/patient-management/directory/all-patients',
    SEARCH_PATIENTS: '/patient-management/search/by-criteria',
  },

  // Appointment Management endpoints
  APPOINTMENT_MANAGEMENT: {
    CREATE_BOOKING: '/appointment-management/booking/create',
    EMERGENCY_BOOKING: '/appointment-management/booking/emergency',
    UPDATE_STATUS: (appointmentId: string) => `/appointment-management/status/${appointmentId}/update`,
    RESCHEDULE: (appointmentId: string) => `/appointment-management/reschedule/${appointmentId}`,
    CANCEL: (appointmentId: string) => `/appointment-management/status/${appointmentId}/update`,
    COMPLETE: (appointmentId: string) => `/appointment-management/complete/${appointmentId}`,
    DETAILS: (appointmentId: string) => `/appointment-management/details/${appointmentId}`,
    DOCTOR_ALL: (doctorId: string) => `/appointment-management/doctor/${doctorId}/all`,
    DOCTOR_TODAY: (doctorId: string) => `/appointment-management/doctor/${doctorId}/today`,
    PATIENT_ALL: (patientId: string) => `/appointment-management/patient/${patientId}/all`,
    ANALYTICS_OVERVIEW: '/appointment-management/analytics/overview',
    SEARCH: '/appointment-management/search/by-criteria',
  },

  // Legacy endpoints for backward compatibility
  AUTH: {
    LOGIN: '/user-management/authentication/login',
    REGISTER: '/user-management/account/create',
    LOGOUT: '/user-management/authentication/logout',
    PROFILE: '/user-management/profile',
    RESET_PASSWORD: '/user-management/authentication/password-reset',
  },
  
  DOCTORS: {
    BASE: '/doctor-management',
    ALL_AVAILABLE_DOCTORS: '/doctor-management/directory/all-active',
    PROFESSIONAL_PROFILE: '/doctor-management/profile',
    SCHEDULE_MANAGEMENT: (doctorId: string) => `/doctor-management/schedule/${doctorId}/working-hours`,
    VACATION_MANAGEMENT: (doctorId: string) => `/doctor-management/availability/${doctorId}/update`,
    MY_PATIENTS_LIST: '/doctor-management/patients',
    INDIVIDUAL_PATIENT_RECORD: (patientId: string) => `/patient-management/profile/${patientId}/details`,
    PROFILE_PICTURE_UPLOAD: (doctorId: string) => `/doctor-management/profile/${doctorId}/update`,
    PATIENT_MEDICAL_RECORDS: (patientId: string) => `/patient-management/medical-history/${patientId}/records`,
    PRACTICE_ANALYTICS: '/doctor-management/analytics',
  },
  
  PATIENTS: {
    BASE: '/patient-management',
    BY_ID: (patientId: string) => `/patient-management/profile/${patientId}/details`,
    HEALTHCARE_DASHBOARD: '/patient-management/dashboard',
    PERSONAL_PROFILE: '/patient-management/profile',
    MEDICAL_HISTORY: '/patient-management/medical-history',
    MY_APPOINTMENTS: '/patient-management/appointments',
    EMERGENCY_CONTACT_MANAGEMENT: '/patient-management/profile/update',
  },

  USERS: {
    ALL_USERS: '/user-management/directory/all-users',
    USER_PROFILE: (userId: string) => `/user-management/profile/${userId}/data`,
  },

  // Health check
  HEALTH_CHECK: '/health',
};

// API service interface
interface ApiService {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>;
  put<T = any, D = any>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T>;
  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  uploadFile<T = any>(url: string, file: File, onProgress?: (percentage: number) => void): Promise<T>;
}

// API service implementation
const api: ApiService = {
  // Generic HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.get(url, config);
    return response.data;
  },

  async post<T, D>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.post(url, data, config);
    return response.data;
  },

  async put<T, D>(url: string, data?: D, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.put(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await apiClient.delete(url, config);
    return response.data;
  },

  // File upload with progress tracking
  async uploadFile<T>(url: string, file: File, onProgress?: (percentage: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const totalLength = progressEvent.total ?? 0;
        if (totalLength > 0) {
          const percentage = Math.round((progressEvent.loaded * 100) / totalLength);
          onProgress(percentage);
        }
      };
    }

    const response: AxiosResponse<T> = await apiClient.post(url, formData, config);
    return response.data;
  },
};

// Domain-specific services (updated to use comprehensive endpoints)
export const authService = {
  // Login - uses new comprehensive endpoint
  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await api.post(ENDPOINTS.USER_MANAGEMENT.LOGIN, credentials);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Register - uses new comprehensive endpoint
  register: async (userData: { 
    name: string; 
    email: string; 
    password: string; 
    role?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    gender?: string;
    date_of_birth?: string;
    specialty?: string;
    bio?: string;
    experience_years?: number;
    consultation_fee?: number;
    [key: string]: any; // Allow additional fields
  }) => {
    try {
      const response = await api.post(ENDPOINTS.USER_MANAGEMENT.CREATE_ACCOUNT, userData);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  // Reset password
  resetPassword: async (email: string) => {
    try {
      const response = await api.post(ENDPOINTS.USER_MANAGEMENT.PASSWORD_RESET, { email });
      return response;
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async (userId?: string) => {
    try {
      if (!userId) {
        const session = await clientAuthHelpers.getCurrentSession();
        if (!session?.user?.id) {
          throw new Error('No authenticated user');
        }
        userId = session.user.id;
      }
      
      const response = await api.get(ENDPOINTS.USER_MANAGEMENT.PROFILE_DATA(userId));
      return response.user;
    } catch (error) {
      console.error('Get profile failed:', error);
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (userId: string, updates: any) => {
    try {
      const response = await api.put(ENDPOINTS.USER_MANAGEMENT.PROFILE_UPDATE(userId), updates);
      return response;
    } catch (error) {
      console.error('Update profile failed:', error);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated: async (): Promise<boolean> => {
    try {
      const session = await clientAuthHelpers.getCurrentSession();
      return !!session?.user;
    } catch {
      return false;
    }
  },

  // Set auth token (legacy - now handled by Supabase)
  setAuthToken: (token: string, persistent = true) => {
    // This is now handled by Supabase automatically
    console.log('Auth token is now managed by Supabase');
  },

  // Clear auth token (legacy - now handled by Supabase)
  clearAuthToken: () => {
    // This is now handled by Supabase automatically
    console.log('Auth token clearing is now managed by Supabase');
  },

  // Logout
  logout: async () => {
    try {
      await clientAuthHelpers.signOut();
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }
};

export const doctorService = {
  // Get all doctors
  getAllDoctors: async (filters?: { specialty?: string; search?: string }) => {
    try {
      const queryParams = new URLSearchParams();
      if (filters?.specialty) queryParams.append('specialty', filters.specialty);
      if (filters?.search) queryParams.append('search', filters.search);
      
      const url = `${ENDPOINTS.DOCTOR_MANAGEMENT.ALL_ACTIVE}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await api.get(url);
      return response.doctors || response.data?.doctors;
    } catch (error) {
      console.error('Get doctors failed:', error);
      throw error;
    }
  },

  // Get doctor profile by UID
  getDoctorProfile: async (uid?: string) => {
    try {
      if (!uid) {
        const session = await clientAuthHelpers.getCurrentSession();
        if (!session?.user?.id) {
          throw new Error('No authenticated user');
        }
        uid = session.user.id;
      }
      
      const response = await api.get(ENDPOINTS.DOCTOR_MANAGEMENT.PROFILE_DETAILS(uid));
      return response.doctor || response.data?.doctor;
    } catch (error) {
      console.error('Get doctor profile failed:', error);
      throw error;
    }
  },

  // Update doctor profile
  updateDoctorProfile: async (uid: string, updates: any) => {
    try {
      const response = await api.put(ENDPOINTS.DOCTOR_MANAGEMENT.PROFILE_UPDATE(uid), updates);
      return response;
    } catch (error) {
      console.error('Update doctor profile failed:', error);
      throw error;
    }
  },

  // Create doctor profile
  createDoctorProfile: async (doctorData: any) => {
    try {
      const response = await api.post(ENDPOINTS.DOCTOR_MANAGEMENT.CREATE_PROFILE, doctorData);
      return response;
    } catch (error) {
      console.error('Create doctor profile failed:', error);
      throw error;
    }
  },

  // Get doctor's appointments
  getDoctorAppointments: async (doctorId: string, status?: string) => {
    try {
      const url = status ? 
        `${ENDPOINTS.DOCTOR_MANAGEMENT.APPOINTMENTS_ALL(doctorId)}?status=${status}` :
        ENDPOINTS.DOCTOR_MANAGEMENT.APPOINTMENTS_ALL(doctorId);
      const response = await api.get(url);
      return response.appointments || response.data?.appointments;
    } catch (error) {
      console.error('Get doctor appointments failed:', error);
      throw error;
    }
  },

  // Get today's appointments
  getTodayAppointments: async (doctorId: string) => {
    try {
      const response = await api.get(ENDPOINTS.DOCTOR_MANAGEMENT.APPOINTMENTS_TODAY(doctorId));
      return response.appointments || response.data?.appointments;
    } catch (error) {
      console.error('Get today appointments failed:', error);
      throw error;
    }
  },

  // Get doctor analytics
  getDoctorAnalytics: async (doctorId: string, period?: number) => {
    try {
      const url = period ? 
        `/doctor-management/analytics?period=${period}&doctorId=${doctorId}` : 
        `/doctor-management/analytics?doctorId=${doctorId}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Get doctor analytics failed:', error);
      throw error;
    }
  },

  // Get working hours
  getWorkingHours: async (doctorId: string) => {
    try {
      const response = await api.get(ENDPOINTS.DOCTOR_MANAGEMENT.WORKING_HOURS(doctorId));
      return response.schedule || response.data?.schedule;
    } catch (error) {
      console.error('Get working hours failed:', error);
      throw error;
    }
  },

  // Update working hours
  updateWorkingHours: async (doctorId: string, schedules: any[]) => {
    try {
      const response = await api.put(ENDPOINTS.DOCTOR_MANAGEMENT.WORKING_HOURS(doctorId), { schedules });
      return response;
    } catch (error) {
      console.error('Update working hours failed:', error);
      throw error;
    }
  },

  // Get availability
  getDoctorAvailability: async (doctorId: string, startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `${ENDPOINTS.DOCTOR_MANAGEMENT.AVAILABILITY_SCHEDULE(doctorId)}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      return response.availability || response.data?.availability;
    } catch (error) {
      console.error('Get doctor availability failed:', error);
      throw error;
    }
  },

  // Update availability
  updateAvailability: async (doctorId: string, availabilityData: any) => {
    try {
      const response = await api.put(ENDPOINTS.DOCTOR_MANAGEMENT.AVAILABILITY_UPDATE(doctorId), availabilityData);
      return response;
    } catch (error) {
      console.error('Update availability failed:', error);
      throw error;
    }
  },

  // Get affiliated centers
  getAffiliatedCenters: async (doctorId: string) => {
    try {
      const response = await api.get(ENDPOINTS.DOCTOR_MANAGEMENT.AFFILIATED_CENTERS(doctorId));
      return response.centers || response.data?.centers;
    } catch (error) {
      console.error('Get affiliated centers failed:', error);
      throw error;
    }
  },

  // Get doctor reviews
  getDoctorReviews: async (doctorId: string) => {
    try {
      const response = await api.get(ENDPOINTS.DOCTOR_MANAGEMENT.REVIEWS(doctorId));
      return response.reviews || response.data?.reviews;
    } catch (error) {
      console.error('Get doctor reviews failed:', error);
      throw error;
    }
  },

  // Legacy methods for backward compatibility
  setSchedule: async (doctorId: string, workHours: any) => {
    return doctorService.updateWorkingHours(doctorId, workHours);
  },

  setVacationDays: async (doctorId: string, vacationDays: any) => {
    return doctorService.updateAvailability(doctorId, { vacationDays });
  },

  uploadProfilePicture: async (doctorId: string, file: File, onProgress?: (percentage: number) => void) => {
    try {
      const response = await api.uploadFile(`/doctor-management/profile/${doctorId}/profile-picture`, file, onProgress);
      return response;
    } catch (error) {
      console.error('Upload profile picture failed:', error);
      throw error;
    }
  }
};

export const userService = {
  // Get all users (admin only)
  getAllUsers: async () => {
    try {
      const response = await api.get(ENDPOINTS.USER_MANAGEMENT.ALL_USERS);
      return response.users || response.data?.users;
    } catch (error) {
      console.error('Get all users failed:', error);
      throw error;
    }
  }
};

// Comprehensive appointment service
export const appointmentService = {
  // Create appointment booking
  createBooking: async (appointmentData: any) => {
    try {
      const response = await api.post(ENDPOINTS.APPOINTMENT_MANAGEMENT.CREATE_BOOKING, appointmentData);
      return response;
    } catch (error) {
      console.error('Create booking failed:', error);
      throw error;
    }
  },

  // Create emergency booking
  createEmergencyBooking: async (emergencyData: any) => {
    try {
      const response = await api.post(ENDPOINTS.APPOINTMENT_MANAGEMENT.EMERGENCY_BOOKING, emergencyData);
      return response;
    } catch (error) {
      console.error('Create emergency booking failed:', error);
      throw error;
    }
  },

  // Update appointment status
  updateStatus: async (appointmentId: string, status: string, notes?: string) => {
    try {
      const response = await api.put(ENDPOINTS.APPOINTMENT_MANAGEMENT.UPDATE_STATUS(appointmentId), { status, notes });
      return response;
    } catch (error) {
      console.error('Update appointment status failed:', error);
      throw error;
    }
  },

  // Reschedule appointment
  rescheduleAppointment: async (appointmentId: string, rescheduleData: any) => {
    try {
      const response = await api.put(ENDPOINTS.APPOINTMENT_MANAGEMENT.RESCHEDULE(appointmentId), rescheduleData);
      return response;
    } catch (error) {
      console.error('Reschedule appointment failed:', error);
      throw error;
    }
  },

  // Complete appointment
  completeAppointment: async (appointmentId: string, completionData: any) => {
    try {
      const response = await api.put(ENDPOINTS.APPOINTMENT_MANAGEMENT.COMPLETE(appointmentId), completionData);
      return response;
    } catch (error) {
      console.error('Complete appointment failed:', error);
      throw error;
    }
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: string, reason?: string) => {
    try {
      const response = await api.put(ENDPOINTS.APPOINTMENT_MANAGEMENT.CANCEL(appointmentId), { 
        status: 'cancelled', 
        notes: reason || 'Cancelled by patient' 
      });
      return response;
    } catch (error) {
      console.error('Cancel appointment failed:', error);
      throw error;
    }
  },

  // Get appointment details
  getAppointmentDetails: async (appointmentId: string) => {
    try {
      const response = await api.get(ENDPOINTS.APPOINTMENT_MANAGEMENT.DETAILS(appointmentId));
      return response.appointment || response.data?.appointment;
    } catch (error) {
      console.error('Get appointment details failed:', error);
      throw error;
    }
  },

  // Get analytics overview
  getAnalyticsOverview: async (startDate?: string, endDate?: string) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const url = `${ENDPOINTS.APPOINTMENT_MANAGEMENT.ANALYTICS_OVERVIEW}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Get analytics overview failed:', error);
      throw error;
    }
  },

  // Search appointments
  searchAppointments: async (criteria: any) => {
    try {
      const response = await api.get(ENDPOINTS.APPOINTMENT_MANAGEMENT.SEARCH, { params: criteria });
      return response.appointments || response.data?.appointments;
    } catch (error) {
      console.error('Search appointments failed:', error);
      throw error;
    }
  }
};

export const patientService = {
  // Get patient profile by UID
  getPatientProfile: async (uid?: string) => {
    try {
      if (!uid) {
        const session = await clientAuthHelpers.getCurrentSession();
        if (!session?.user?.id) {
          throw new Error('No authenticated user');
        }
        uid = session.user.id;
      }
      
      const response = await api.get(ENDPOINTS.PATIENT_MANAGEMENT.PROFILE_DETAILS(uid));
      return response.patient || response.data?.patient;
    } catch (error) {
      console.error('Get patient profile failed:', error);
      throw error;
    }
  },

  // Update patient profile
  updatePatientProfile: async (uid: string, updates: any) => {
    try {
      const response = await api.put(ENDPOINTS.PATIENT_MANAGEMENT.PROFILE_UPDATE(uid), updates);
      return response;
    } catch (error) {
      console.error('Update patient profile failed:', error);
      throw error;
    }
  },

  // Create patient profile
  createPatientProfile: async (patientData: any) => {
    try {
      const response = await api.post(ENDPOINTS.PATIENT_MANAGEMENT.CREATE_PROFILE, patientData);
      return response;
    } catch (error) {
      console.error('Create patient profile failed:', error);
      throw error;
    }
  },

  // Get patient dashboard
  getPatientDashboard: async (uid?: string) => {
    try {
      if (!uid) {
        const session = await clientAuthHelpers.getCurrentSession();
        if (!session?.user?.id) {
          throw new Error('No authenticated user');
        }
        uid = session.user.id;
      }
      
      const response = await api.get(ENDPOINTS.PATIENT_MANAGEMENT.DASHBOARD_OVERVIEW);
      return response.dashboard || response.data || response;
    } catch (error) {
      console.error('Get patient dashboard failed:', error);
      throw error;
    }
  },

  // Get patient medical records
  getPatientMedicalRecords: async (uid: string) => {
    try {
      const response = await api.get(ENDPOINTS.PATIENT_MANAGEMENT.MEDICAL_HISTORY(uid));
      return response.data || response.records;
    } catch (error) {
      console.error('Get patient medical records failed:', error);
      throw error;
    }
  },

  // Add medical record
  addMedicalRecord: async (patientId: string, recordData: any) => {
    try {
      const response = await api.post(ENDPOINTS.PATIENT_MANAGEMENT.ADD_MEDICAL_RECORD(patientId), recordData);
      return response;
    } catch (error) {
      console.error('Add medical record failed:', error);
      throw error;
    }
  },

  // Get patient appointments
  getPatientAppointments: async (patientId: string, status?: string) => {
    try {
      const url = status ? 
        `${ENDPOINTS.PATIENT_MANAGEMENT.APPOINTMENTS_ALL(patientId)}?status=${status}` :
        ENDPOINTS.PATIENT_MANAGEMENT.APPOINTMENTS_ALL(patientId);
      const response = await api.get(url);
      return response.data || response.appointments;
    } catch (error) {
      console.error('Get patient appointments failed:', error);
      throw error;
    }
  },

  // Get upcoming appointments
  getUpcomingAppointments: async (patientId: string) => {
    try {
      const response = await api.get(ENDPOINTS.PATIENT_MANAGEMENT.APPOINTMENTS_UPCOMING(patientId));
      return response.data || response.appointments;
    } catch (error) {
      console.error('Get upcoming appointments failed:', error);
      throw error;
    }
  },

  // Get appointment history
  getAppointmentHistory: async (patientId: string) => {
    try {
      const response = await api.get(ENDPOINTS.PATIENT_MANAGEMENT.APPOINTMENTS_HISTORY(patientId));
      return response.data || response.appointments;
    } catch (error) {
      console.error('Get appointment history failed:', error);
      throw error;
    }
  },

  // Create doctor review
  createDoctorReview: async (patientId: string, reviewData: any) => {
    try {
      const response = await api.post(ENDPOINTS.PATIENT_MANAGEMENT.CREATE_REVIEW(patientId), reviewData);
      return response;
    } catch (error) {
      console.error('Create doctor review failed:', error);
      throw error;
    }
  },

  // Update emergency contact
  updateEmergencyContact: async (uid: string, emergencyContact: any) => {
    try {
      const response = await api.put(ENDPOINTS.PATIENT_MANAGEMENT.PROFILE_UPDATE(uid), { emergency_contact: emergencyContact });
      return response;
    } catch (error) {
      console.error('Update emergency contact failed:', error);
      throw error;
    }
  },
};

// Helper function to get dashboard by role
function getDashboardByRole(role: string): string {
  switch (role.toLowerCase()) {
    case 'doctor':
      return '/doctor-dashboard';
    case 'admin':
      return '/doctor-dashboard';
    case 'patient':
    default:
      return '/patient-dashboard';
  }
}

// Comprehensive API object for easy access
export const comprehensiveAPI = {
  userManagement: {
    createAccount: (userData: any) => authService.register(userData),
    authenticateUser: (credentials: { email: string; password: string }) => authService.login(credentials),
    resetPassword: (email: string) => authService.resetPassword(email),
    getProfileData: (uid: string) => authService.getProfile(uid),
    updateProfile: (uid: string, updates: any) => authService.updateProfile(uid, updates),
    getAllUsers: () => userService.getAllUsers(),
  },
  
  doctorManagement: {
    createProfile: (doctorData: any) => doctorService.createDoctorProfile(doctorData),
    getProfileDetails: (uid: string) => doctorService.getDoctorProfile(uid),
    updateProfile: (uid: string, updates: any) => doctorService.updateDoctorProfile(uid, updates),
    getAllActiveDoctors: () => doctorService.getAllDoctors(),
    getDoctorsBySpecialty: (specialty: string) => doctorService.getAllDoctors({ specialty }),
    getDoctorAvailability: (doctorId: string, startDate?: string, endDate?: string) => 
      doctorService.getDoctorAvailability(doctorId, startDate, endDate),
    updateAvailability: (doctorId: string, availabilityData: any) => 
      doctorService.updateAvailability(doctorId, availabilityData),
    getDoctorAppointments: (doctorId: string, status?: string) => 
      doctorService.getDoctorAppointments(doctorId, status),
    getTodayAppointments: (doctorId: string) => doctorService.getTodayAppointments(doctorId),
    getWorkingHours: (doctorId: string) => doctorService.getWorkingHours(doctorId),
    updateWorkingHours: (doctorId: string, schedules: any[]) => 
      doctorService.updateWorkingHours(doctorId, schedules),
    getDoctorReviews: (doctorId: string) => doctorService.getDoctorReviews(doctorId),
    getAffiliatedCenters: (doctorId: string) => doctorService.getAffiliatedCenters(doctorId),
  },
  
  patientManagement: {
    createProfile: (patientData: any) => patientService.createPatientProfile(patientData),
    getProfileDetails: (uid: string) => patientService.getPatientProfile(uid),
    updateProfile: (uid: string, updates: any) => patientService.updatePatientProfile(uid, updates),
    getMedicalHistory: (uid: string) => patientService.getPatientMedicalRecords(uid),
    addMedicalRecord: (patientId: string, recordData: any) => 
      patientService.addMedicalRecord(patientId, recordData),
    getPatientAppointments: (patientId: string, status?: string) => 
      patientService.getPatientAppointments(patientId, status),
    getUpcomingAppointments: (patientId: string) => patientService.getUpcomingAppointments(patientId),
    getAppointmentHistory: (patientId: string) => patientService.getAppointmentHistory(patientId),
    getDashboardOverview: (uid: string) => patientService.getPatientDashboard(uid),
    createDoctorReview: (patientId: string, reviewData: any) => 
      patientService.createDoctorReview(patientId, reviewData),
  },
  
  appointmentManagement: {
    createBooking: (appointmentData: any) => appointmentService.createBooking(appointmentData),
    createEmergencyBooking: (emergencyData: any) => appointmentService.createEmergencyBooking(emergencyData),
    updateStatus: (appointmentId: string, status: string, notes?: string) => 
      appointmentService.updateStatus(appointmentId, status, notes),
    rescheduleAppointment: (appointmentId: string, rescheduleData: any) => 
      appointmentService.rescheduleAppointment(appointmentId, rescheduleData),
    completeAppointment: (appointmentId: string, completionData: any) => 
      appointmentService.completeAppointment(appointmentId, completionData),
    cancelAppointment: (appointmentId: string, reason?: string) => appointmentService.cancelAppointment(appointmentId, reason),
    getAppointmentDetails: (appointmentId: string) => appointmentService.getAppointmentDetails(appointmentId),
    getAnalyticsOverview: (startDate?: string, endDate?: string) => 
      appointmentService.getAnalyticsOverview(startDate, endDate),
    searchAppointments: (criteria: any) => appointmentService.searchAppointments(criteria),
  }
};

// Export everything
export { 
  api, 
  ENDPOINTS, 
  getDashboardByRole
};
export default api;
