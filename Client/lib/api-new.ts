import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Base URL - use environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
        // Get current JWT token from localStorage
        const token = localStorage.getItem('auth_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
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
            // Clear auth data and redirect to login
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            console.error('Authentication failed. Redirecting to login.');
            window.location.href = '/login';
          } catch (signOutError) {
            console.error('Error clearing auth data:', signOutError);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// API helper functions
const api = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient.get(url, config);
    return response.data;
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient.post(url, data, config);
    return response.data;
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient.put(url, data, config);
    return response.data;
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient.delete(url, config);
    return response.data;
  },

  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient.patch(url, data, config);
    return response.data;
  },

  // For multipart form data uploads
  postForm: async <T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await apiClient.post(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

// Authentication service (simplified for JWT)
export const authService = {
  // Login - uses JWT endpoint
  login: async (credentials: { phone: string; password: string }) => {
    try {
      const response = await api.post('/api/auth/login', credentials);
      return response;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  // Register - uses JWT endpoint
  register: async (userData: any) => {
    try {
      const response = await api.post('/api/auth/register', userData);
      return response;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  },

  // Verify token
  verifyToken: async () => {
    try {
      const response = await api.get('/api/auth/verify');
      return response;
    } catch (error) {
      console.error('Token verification failed:', error);
      throw error;
    }
  },

  // Get user profile
  getProfile: async () => {
    try {
      const response = await api.get('/api/auth/profile');
      return response;
    } catch (error) {
      console.error('Get profile failed:', error);
      throw error;
    }
  },
};

// Appointment service with JWT authentication
export const appointmentService = {
  // Book appointment
  book: async (appointmentData: any) => {
    try {
      const response = await api.post('/api/appointments/book', appointmentData);
      return response;
    } catch (error) {
      console.error('Appointment booking failed:', error);
      throw error;
    }
  },

  // Get appointments
  getAppointments: async () => {
    try {
      const response = await api.get('/api/appointments');
      return response;
    } catch (error) {
      console.error('Get appointments failed:', error);
      throw error;
    }
  },

  // Get appointment by ID
  getAppointment: async (id: string) => {
    try {
      const response = await api.get(`/api/appointments/${id}`);
      return response;
    } catch (error) {
      console.error('Get appointment failed:', error);
      throw error;
    }
  },

  // Update appointment
  update: async (id: string, updates: any) => {
    try {
      const response = await api.put(`/api/appointments/${id}`, updates);
      return response;
    } catch (error) {
      console.error('Update appointment failed:', error);
      throw error;
    }
  },

  // Cancel appointment
  cancel: async (id: string) => {
    try {
      const response = await api.delete(`/api/appointments/${id}`);
      return response;
    } catch (error) {
      console.error('Cancel appointment failed:', error);
      throw error;
    }
  },

  // Reschedule appointment
  reschedule: async (id: string, newDate: string, newTime: string) => {
    try {
      const response = await api.put(`/api/appointments/${id}/reschedule`, {
        appointment_date: newDate,
        appointment_time: newTime
      });
      return response;
    } catch (error) {
      console.error('Reschedule appointment failed:', error);
      throw error;
    }
  },
};

// Doctor service
export const doctorService = {
  // Get all doctors
  getAll: async () => {
    try {
      const response = await api.get('/api/doctors');
      return response;
    } catch (error) {
      console.error('Get doctors failed:', error);
      throw error;
    }
  },

  // Get doctor by ID
  getById: async (id: string) => {
    try {
      const response = await api.get(`/api/doctors/${id}`);
      return response;
    } catch (error) {
      console.error('Get doctor failed:', error);
      throw error;
    }
  },

  // Get doctor's availability
  getAvailability: async (doctorId: string, date: string) => {
    try {
      const response = await api.get(`/api/doctors/${doctorId}/availability?date=${date}`);
      return response;
    } catch (error) {
      console.error('Get doctor availability failed:', error);
      throw error;
    }
  },
};

// Patient service
export const patientService = {
  // Get patient profile
  getProfile: async () => {
    try {
      const response = await api.get('/api/patients/profile');
      return response;
    } catch (error) {
      console.error('Get patient profile failed:', error);
      throw error;
    }
  },

  // Update patient profile
  updateProfile: async (updates: any) => {
    try {
      const response = await api.put('/api/patients/profile', updates);
      return response;
    } catch (error) {
      console.error('Update patient profile failed:', error);
      throw error;
    }
  },
};

// Export the main API client for custom requests
export { apiClient };
export default api;
