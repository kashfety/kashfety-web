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
    if (typeof window !== 'undefined') {
      try {
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
    if (error.response) {
      const status = error.response.status;
      
      if (status === 401) {
        if (typeof window !== 'undefined') {
          try {
            await clientAuthHelpers.signOut();
            window.location.href = '/login';
          } catch (signOutError) {
            console.error('Error during sign out:', signOutError);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Generic API request function
const makeRequest = async <T>(
  config: AxiosRequestConfig
): Promise<{ data: T; success: boolean; message?: string }> => {
  try {
    const response: AxiosResponse = await apiClient(config);
    return {
      data: response.data,
      success: true,
      message: response.data.message
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'An unexpected error occurred'
      );
    }
    throw error;
  }
};

// User Management API
export const userManagementAPI = {
  // Account creation and authentication
  createAccount: (userData: any) => 
    makeRequest({
      method: 'POST',
      url: '/user-management/account/create',
      data: userData
    }),

  authenticateUser: (credentials: { email: string; password: string }) =>
    makeRequest({
      method: 'POST', 
      url: '/user-management/authentication/login',
      data: credentials
    }),

  resetPassword: (email: string) =>
    makeRequest({
      method: 'POST',
      url: '/user-management/authentication/password-reset',
      data: { email }
    }),

  // Profile management
  getProfileData: (uid: string) =>
    makeRequest({
      method: 'GET',
      url: `/user-management/profile/${uid}/data`
    }),

  updateProfile: (uid: string, updates: any) =>
    makeRequest({
      method: 'PUT',
      url: `/user-management/profile/${uid}/update`,
      data: updates
    }),

  updateUserRole: (uid: string, role: string) =>
    makeRequest({
      method: 'PUT',
      url: `/user-management/profile/${uid}/role`,
      data: { role }
    }),

  deleteAccount: (uid: string) =>
    makeRequest({
      method: 'DELETE',
      url: `/user-management/account/${uid}/delete`
    }),

  // Directory and admin
  getAllUsers: () =>
    makeRequest({
      method: 'GET',
      url: '/user-management/directory/all-users'
    })
};

// Doctor Management API
export const doctorManagementAPI = {
  // Profile management
  createProfile: (doctorData: any) =>
    makeRequest({
      method: 'POST',
      url: '/doctor-management/profile/create',
      data: doctorData
    }),

  getProfileDetails: (uid: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/profile/${uid}/details`
    }),

  updateProfile: (uid: string, updates: any) =>
    makeRequest({
      method: 'PUT',
      url: `/doctor-management/profile/${uid}/update`,
      data: updates
    }),

  // Directory and discovery
  getAllActiveDoctors: () =>
    makeRequest({
      method: 'GET',
      url: '/doctor-management/directory/all-active'
    }),

  getDoctorsBySpecialty: (specialty: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/directory/by-specialty/${specialty}`
    }),

  // Availability management
  getDoctorAvailability: (doctorId: string, startDate?: string, endDate?: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/availability/${doctorId}/schedule`,
      params: { startDate, endDate }
    }),

  updateAvailability: (doctorId: string, availabilityData: any) =>
    makeRequest({
      method: 'PUT',
      url: `/doctor-management/availability/${doctorId}/update`,
      data: availabilityData
    }),

  // Appointments
  getDoctorAppointments: (doctorId: string, status?: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/appointments/${doctorId}/all`,
      params: { status }
    }),

  getTodayAppointments: (doctorId: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/appointments/${doctorId}/today`
    }),

  // Schedule management
  getWorkingHours: (doctorId: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/schedule/${doctorId}/working-hours`
    }),

  updateWorkingHours: (doctorId: string, schedules: any[]) =>
    makeRequest({
      method: 'PUT',
      url: `/doctor-management/schedule/${doctorId}/working-hours`,
      data: { schedules }
    }),

  // Reviews and centers
  getDoctorReviews: (doctorId: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/reviews/${doctorId}/all`
    }),

  getAffiliatedCenters: (doctorId: string) =>
    makeRequest({
      method: 'GET',
      url: `/doctor-management/centers/${doctorId}/affiliated`
    }),

  affiliateWithCenter: (doctorId: string, centerData: any) =>
    makeRequest({
      method: 'POST',
      url: `/doctor-management/centers/${doctorId}/affiliate`,
      data: centerData
    })
};

// Patient Management API
export const patientManagementAPI = {
  // Profile management
  createProfile: (patientData: any) =>
    makeRequest({
      method: 'POST',
      url: '/patient-management/profile/create',
      data: patientData
    }),

  getProfileDetails: (uid: string) =>
    makeRequest({
      method: 'GET',
      url: `/patient-management/profile/${uid}/details`
    }),

  updateProfile: (uid: string, updates: any) =>
    makeRequest({
      method: 'PUT',
      url: `/patient-management/profile/${uid}/update`,
      data: updates
    }),

  // Medical history
  getMedicalHistory: (uid: string) =>
    makeRequest({
      method: 'GET',
      url: `/patient-management/medical-history/${uid}/records`
    }),

  addMedicalRecord: (patientId: string, recordData: any) =>
    makeRequest({
      method: 'POST',
      url: `/patient-management/medical-history/${patientId}/add-record`,
      data: recordData
    }),

  // Appointments
  getPatientAppointments: (patientId: string, status?: string) =>
    makeRequest({
      method: 'GET',
      url: `/patient-management/appointments/${patientId}/all`,
      params: { status }
    }),

  getUpcomingAppointments: (patientId: string) =>
    makeRequest({
      method: 'GET',
      url: `/patient-management/appointments/${patientId}/upcoming`
    }),

  getAppointmentHistory: (patientId: string) =>
    makeRequest({
      method: 'GET',
      url: `/patient-management/appointments/${patientId}/history`
    }),

  // Dashboard
  getDashboardOverview: (uid: string) =>
    makeRequest({
      method: 'GET',
      url: `/patient-management/dashboard/${uid}/overview`
    }),

  // Reviews
  createDoctorReview: (patientId: string, reviewData: any) =>
    makeRequest({
      method: 'POST',
      url: `/patient-management/reviews/${patientId}/create`,
      data: reviewData
    }),

  // Directory (admin)
  getAllPatients: () =>
    makeRequest({
      method: 'GET',
      url: '/patient-management/directory/all-patients'
    }),

  searchPatients: (criteria: any) =>
    makeRequest({
      method: 'GET',
      url: '/patient-management/search/by-criteria',
      params: criteria
    })
};

// Appointment Management API
export const appointmentManagementAPI = {
  // Booking
  createBooking: (appointmentData: any) =>
    makeRequest({
      method: 'POST',
      url: '/appointment-management/booking/create',
      data: appointmentData
    }),

  createEmergencyBooking: (emergencyData: any) =>
    makeRequest({
      method: 'POST',
      url: '/appointment-management/booking/emergency',
      data: emergencyData
    }),

  // Status management
  updateStatus: (appointmentId: string, status: string, notes?: string) =>
    makeRequest({
      method: 'PUT',
      url: `/appointment-management/status/${appointmentId}/update`,
      data: { status, notes }
    }),

  rescheduleAppointment: (appointmentId: string, rescheduleData: any) =>
    makeRequest({
      method: 'PUT',
      url: `/appointment-management/reschedule/${appointmentId}`,
      data: rescheduleData
    }),

  completeAppointment: (appointmentId: string, completionData: any) =>
    makeRequest({
      method: 'PUT',
      url: `/appointment-management/complete/${appointmentId}`,
      data: completionData
    }),

  // Details and information
  getAppointmentDetails: (appointmentId: string) =>
    makeRequest({
      method: 'GET',
      url: `/appointment-management/details/${appointmentId}`
    }),

  // Doctor appointments
  getDoctorAppointments: (doctorId: string, params?: any) =>
    makeRequest({
      method: 'GET',
      url: `/appointment-management/doctor/${doctorId}/all`,
      params
    }),

  getDoctorTodayAppointments: (doctorId: string) =>
    makeRequest({
      method: 'GET',
      url: `/appointment-management/doctor/${doctorId}/today`
    }),

  // Patient appointments
  getPatientAppointments: (patientId: string, params?: any) =>
    makeRequest({
      method: 'GET',
      url: `/appointment-management/patient/${patientId}/all`,
      params
    }),

  // Analytics and search
  getAnalyticsOverview: (startDate?: string, endDate?: string) =>
    makeRequest({
      method: 'GET',
      url: '/appointment-management/analytics/overview',
      params: { startDate, endDate }
    }),

  searchAppointments: (criteria: any) =>
    makeRequest({
      method: 'GET',
      url: '/appointment-management/search/by-criteria',
      params: criteria
    })
};

// Legacy API exports for backward compatibility
export const api = {
  get: (url: string, config?: AxiosRequestConfig) => apiClient.get(url, config),
  post: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.post(url, data, config),
  put: (url: string, data?: any, config?: AxiosRequestConfig) => apiClient.put(url, data, config),
  delete: (url: string, config?: AxiosRequestConfig) => apiClient.delete(url, config)
};

// Authentication service (legacy)
export const authService = {
  signup: userManagementAPI.createAccount,
  login: userManagementAPI.authenticateUser,
  resetPassword: userManagementAPI.resetPassword,
  
  isAuthenticated: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userToken') !== null;
    }
    return false;
  },
  
  getUserRole: () => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('userRole');
    }
    return null;
  },
  
  getUserDashboard: () => {
    const role = authService.getUserRole();
    switch(role?.toLowerCase()) {
      case "doctor":
        return "/doctor-dashboard";
      case "admin": 
        return "/doctor-dashboard";
      case "patient":
      default:
        return "/patient";
    }
  }
};

// Export comprehensive API object
export const comprehensiveAPI = {
  userManagement: userManagementAPI,
  doctorManagement: doctorManagementAPI,
  patientManagement: patientManagementAPI,
  appointmentManagement: appointmentManagementAPI
};

export default comprehensiveAPI;
