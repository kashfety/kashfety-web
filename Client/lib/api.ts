import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

// API Base URL - use environment variable in production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Frontend API Base URL for public endpoints (Next.js server)
const FRONTEND_API_BASE_URL = process.env.NEXT_PUBLIC_FRONTEND_API_URL || 'http://localhost:3000';

// Create axios instance with default config for backend
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create axios instance for frontend public APIs
const frontendApiClient = axios.create({
  baseURL: FRONTEND_API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth tokens to frontend API client as well
frontendApiClient.interceptors.request.use(
  async (config) => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      try {
        // Get current JWT token from localStorage
        const token = localStorage.getItem('auth_token');
        
        // Add token for protected endpoints (auth/, center-dashboard/, or download routes)
        if (token && config.headers && config.url && (
          config.url.includes('/api/auth/') || 
          config.url.includes('/api/center-dashboard/') ||
          config.url.includes('/download-lab-result/')
        )) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Adding auth token to frontend request:', config.url);
        } else if (config.url && (
          config.url.includes('/api/auth/') || 
          config.url.includes('/api/center-dashboard/') ||
          config.url.includes('/download-lab-result/')
        )) {
          console.warn('⚠️ No token available for protected frontend endpoint:', config.url);
        }
      } catch (error) {
        console.error('❌ Error getting auth token for frontend request:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor for error handling to frontend API client
frontendApiClient.interceptors.response.use(
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
            // Check if this is a request to a protected endpoint
            const requestUrl = error.config?.url || '';
            const isProtectedEndpoint = requestUrl.includes('/api/auth/');
            
            if (isProtectedEndpoint) {
              // Clear auth data and redirect to login
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              console.error('Authentication failed on frontend API. Redirecting to login.');
              window.location.href = '/login';
            }
          } catch (signOutError) {
            console.error('Error handling frontend auth error:', signOutError);
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Add request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config) => {
    // Only run on client-side
    if (typeof window !== 'undefined') {
      try {
        // Get current JWT token from localStorage
        const token = localStorage.getItem('auth_token');

        // Check if this is a request that should NOT include auth token (public endpoints)
        const requestUrl = config.url || '';
        const isPublicEndpoint = requestUrl.includes('/doctors/all') ||
          requestUrl.includes('/auth/login') ||
          requestUrl.includes('/auth/register') ||
          requestUrl.includes('/auth/verify');

        // Add token for all requests EXCEPT public endpoints
        if (token && config.headers && !isPublicEndpoint) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('✅ Adding auth token to request:', requestUrl);
        } else if (!isPublicEndpoint) {
          console.warn('⚠️ No token available for protected endpoint:', requestUrl);
          console.warn('Token exists:', !!token, 'Headers exists:', !!config.headers);
        } else {
          console.log('📍 Public endpoint, no token needed:', requestUrl);
        }
      } catch (error) {
        console.error('❌ Error getting auth token:', error);
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

      // Handle auth errors - but be more selective about when to redirect
      if (status === 401) {
        // Only run on client-side
        if (typeof window !== 'undefined') {
          try {
            // Check if this is a request to a public endpoint that shouldn't trigger logout
            const requestUrl = error.config?.url || '';
            const isPublicEndpoint = requestUrl.includes('/doctors/all') ||
              requestUrl.includes('/auth/verify') ||
              requestUrl.includes('/auth/login') ||
              requestUrl.includes('/auth/register');

            if (!isPublicEndpoint) {
              // Clear auth data and redirect to login only for protected endpoints
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
              console.error('Authentication failed. Redirecting to login.');
              window.location.href = '/login';
            } else {
              console.warn('Public endpoint returned 401, but not redirecting to login');
            }
          } catch (signOutError) {
            console.error('Error handling auth error:', signOutError);
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

// Frontend API helper functions (for public endpoints on Next.js server)
const frontendApi = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await frontendApiClient.get(url, config);
    return response.data;
  },

  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await frontendApiClient.post(url, data, config);
    return response.data;
  },

  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await frontendApiClient.put(url, data, config);
    return response.data;
  },

  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await frontendApiClient.delete(url, config);
    return response.data;
  },

  // For multipart form data uploads
  postForm: async <T = any>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> => {
    const response: AxiosResponse<T> = await frontendApiClient.post(url, formData, {
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
  book: async (appointmentData: {
    doctor_id: string;
    appointment_date: string;
    appointment_time: string;
    type?: string;
    appointment_type?: string;
    duration?: number;
    notes?: string;
    symptoms?: string;
    consultation_fee?: number;
    center_id?: string;
  }) => {
    try {
      // Get the current user from localStorage to get patient_id
      const userStr = localStorage.getItem('auth_user');
      const tokenStr = localStorage.getItem('auth_token');

      console.log('🔍 API Service Debug - Token exists:', !!tokenStr);
      console.log('🔍 API Service Debug - User data exists:', !!userStr);

      if (!userStr) {
        throw new Error('No user found. Please log in again.');
      }

      if (!tokenStr) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const user = JSON.parse(userStr);
      console.log('🔍 API Service Debug - Parsed user:', user);

      if (!user.id) {
        throw new Error('Invalid user data. Please log in again.');
      }

      // Verify user role
      if (user.role !== 'patient') {
        console.warn('⚠️ User role is not patient:', user.role);
        // Stop here: backend expects a patient_id belonging to a user with role 'patient'
        throw new Error('You must be logged in as a patient to book an appointment. Please switch to a patient account.');
      }

      // Prepare the data in the format expected by the unified auth system
      const requestData = {
        patient_id: user.id, // The unified system expects patient_id
        doctor_id: appointmentData.doctor_id,
        appointment_date: appointmentData.appointment_date,
        appointment_time: appointmentData.appointment_time,
        duration: appointmentData.duration || 30,
        type: appointmentData.type || 'consultation',
        appointment_type: appointmentData.appointment_type || 'clinic', // Add appointment_type field
        notes: appointmentData.notes || '',
        symptoms: appointmentData.symptoms || '',
        consultation_fee: appointmentData.consultation_fee || 0,
        center_id: appointmentData.center_id || null
      };

      console.log('📤 API Service - Sending appointment request to /api/auth/appointments');
      console.log('📤 API Service - Request data:', requestData);
      console.log('📤 API Service - User context:', {
        id: user.id,
        role: user.role,
        name: user.name || `${user.first_name} ${user.last_name}`
      });

      // Use the unified auth endpoint
      const response = await api.post('/api/auth/appointments', requestData);

      console.log('✅ API Service - Response received:', response);
      return response;
    } catch (error) {
      console.error('❌ API Service - Appointment booking failed:', error);

      // Enhanced error logging
      if (error instanceof Error) {
        console.error('❌ API Service - Error message:', error.message);
        console.error('❌ API Service - Error stack:', error.stack);
      }

      if ((error as any).response) {
        console.error('❌ API Service - HTTP Response:', {
          status: (error as any).response.status,
          statusText: (error as any).response.statusText,
          data: (error as any).response.data
        });
      }

      throw error;
    }
  },

  // Get appointments for the current user
  getAppointments: async () => {
    try {
      // Get current user from localStorage to determine user ID
      const storedUser = localStorage.getItem('auth_user');
      if (!storedUser) {
        throw new Error('No user found. Please login again.');
      }

      const user = JSON.parse(storedUser);
      const response = await api.get(`/api/auth/appointments/${user.id}?role=${user.role}`);
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
  cancel: async (id: string, reason?: string) => {
    try {
      const response = await api.put(`/api/auth/appointments/${id}/cancel`, {
        reason: reason || 'Cancelled by patient'
      });
      return response;
    } catch (error) {
      console.error('Cancel appointment failed:', error);
      throw error;
    }
  },

  // Reschedule appointment
  reschedule: async (id: string, newDate: string, newTime: string) => {
    try {
      const response = await api.put(`/api/auth/appointments/${id}/reschedule`, {
        new_date: newDate,
        new_time: newTime
      });
      return response;
    } catch (error) {
      console.error('Reschedule appointment failed:', error);
      throw error;
    }
  },

  // Reschedule appointment (alternative method with reschedule data object)
  rescheduleAppointment: async (id: string, rescheduleData: { appointment_date: string; appointment_time: string; reason?: string }) => {
    try {
      const response = await api.put(`/api/auth/appointments/${id}/reschedule`, {
        new_date: rescheduleData.appointment_date,
        new_time: rescheduleData.appointment_time
      });
      return response;
    } catch (error) {
      console.error('Reschedule appointment failed:', error);
      throw error;
    }
  },

  // Cancel appointment (alternative method for compatibility)
  cancelAppointment: async (id: string, reason?: string) => {
    try {
      const response = await api.put(`/api/auth/appointments/${id}/cancel`, {
        reason: reason || 'Cancelled by patient'
      });
      return response;
    } catch (error) {
      console.error('Cancel appointment failed:', error);
      throw error;
    }
  },
};

// Lab/Imaging service
export const labService = {
  getTypes: async () => frontendApi.get('/api/public/lab-tests/types'),
  getCenters: async (params?: { lab_test_type_id?: string; category?: 'lab'|'imaging' }) =>
    frontendApi.get('/api/public/lab-tests/centers', { params }),
  getCenterServices: async (centerId: string) =>
    frontendApi.get(`/api/public/lab-tests/centers/${centerId}/services`),
  getAvailableDates: async (centerId: string, typeId: string, range?: { start_date?: string; end_date?: string }) =>
    frontendApi.get(`/api/auth/lab-tests/centers/${centerId}/types/${typeId}/available-dates`, { params: range }),
  getAvailableSlots: async (centerId: string, typeId: string, date: string) =>
    frontendApi.get(`/api/auth/lab-tests/centers/${centerId}/types/${typeId}/available-slots`, { params: { date } }),
  book: async (booking: { center_id: string; lab_test_type_id: string; booking_date: string; booking_time: string; notes?: string; duration?: number; fee?: number; }) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (!userStr) throw new Error('No user found. Please log in.');
    const user = JSON.parse(userStr);
    if (user.role !== 'patient') throw new Error('You must be logged in as a patient to book a lab test');
    return frontendApi.post('/api/auth/lab-tests/book', { patient_id: user.id, ...booking });
  },
  myBookings: async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    if (!userStr) throw new Error('No user found. Please log in.');
    const user = JSON.parse(userStr);
    return frontendApi.get(`/api/auth/lab-tests/patients/${user.id}/bookings`);
  },
  reschedule: async (bookingId: string, newDate: string, newTime: string, reason?: string) =>
    frontendApi.put(`/api/auth/lab-tests/bookings/${bookingId}/reschedule`, { newDate, newTime, reason }),
  cancel: async (bookingId: string, reason?: string) =>
    frontendApi.put(`/api/auth/lab-tests/bookings/${bookingId}/cancel`, { reason }),
  updateStatus: async (bookingId: string, status: string, notes?: string) =>
    frontendApi.put(`/api/auth/lab-tests/bookings/${bookingId}/status`, { status, notes }),
  attachResult: async (bookingId: string, payload: { result_file_url?: string; result_notes?: string }) =>
    frontendApi.put(`/api/auth/lab-tests/bookings/${bookingId}/result`, payload)
};

// Center admin service
export const centerService = {
  getProfile: async () => {
    // Try to get center ID from user for fallback
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get('/api/auth/center/profile', { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  updateProfile: async (updates: any) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.put('/api/auth/center/profile', updates, { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  upcomingBookings: async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    console.log('🔄 centerService.upcomingBookings called with user:', { 
      userId: user?.id, 
      centerId, 
      role: user?.role 
    });
    
    return frontendApi.get('/api/auth/lab-tests/center/today', { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  listServices: async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get('/api/auth/center/lab-services', { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  saveServices: async (services: Array<{ lab_test_type_id: string; base_fee?: number; is_active?: boolean }>) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.put('/api/auth/center/lab-services', { services }, { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  getLabSchedule: async (lab_test_type_id?: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get('/api/auth/center/lab-schedule', { 
      params: { 
        ...(lab_test_type_id ? { lab_test_type_id } : {}),
        ...(centerId ? { center_id: centerId } : {})
      } 
    });
  },
  saveLabSchedule: async (lab_test_type_id: string, schedule: Array<{ day_of_week: number; is_available: boolean; slots: Array<{ time: string; duration?: number }>; break_start?: string; break_end?: string; notes?: string; slot_duration?: number }>) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.put('/api/auth/center/lab-schedule', { lab_test_type_id, schedule }, { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  uploadResult: async (bookingId: string, file: File, result_notes?: string) => {
    const form = new FormData();
    form.append('labResult', file); // Changed from 'file' to 'labResult' to match backend
    form.append('booking_id', bookingId);
    if (result_notes) {
      form.append('result_notes', result_notes);
    }
    
    // Use the new Supabase Storage route
    return frontendApi.postForm('/api/center-dashboard/upload-lab-result', form);
  },
  listPatients: async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get('/api/auth/center/patients', { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  getPatientDetails: async (patientId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get(`/api/auth/center/patients/${patientId}`, { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  getPatientMedicalRecords: async (patientId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get(`/api/auth/center/patients/${patientId}/medical-records`, { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  getPatientLabHistory: async (patientId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get(`/api/auth/center/patients/${patientId}/lab-history`, { 
      params: centerId ? { center_id: centerId } : {} 
    });
  },
  listBookings: async (params?: { status?: string; page?: number; limit?: number }) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get('/api/auth/center/bookings', { 
      params: { 
        ...(params || {}),
        ...(centerId ? { center_id: centerId } : {})
      } 
    });
  },
  getAnalytics: async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('auth_user') : null;
    const user = userStr ? JSON.parse(userStr) : null;
    const centerId = user?.center_id || user?.id;
    
    return frontendApi.get('/api/auth/center/analytics', { 
      params: centerId ? { center_id: centerId } : {} 
    });
  }
};

// Doctor service
export const doctorService = {
  // Get all doctors
  getAll: async () => {
    try {
      const response = await api.get('/api/doctors/all');
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

// Admin service for admin dashboard functionality
export const adminService = {
  // Get all users with pagination and filtering
  getAllUsers: async (params?: { page?: number; limit?: number; role?: string; status?: string; search?: string }) => {
    try {
      const response = await api.get('/api/auth/admin/users', { params });
      return response;
    } catch (error) {
      console.error('Get all users failed:', error);
      throw error;
    }
  },

  // Get user by ID
  getUserById: async (id: string) => {
    try {
      const response = await api.get(`/api/auth/admin/users/${id}`);
      return response;
    } catch (error) {
      console.error('Get user failed:', error);
      throw error;
    }
  },

  // Update user status
  updateUserStatus: async (id: string, status: string) => {
    try {
      const response = await api.put(`/api/auth/admin/users/${id}/status`, { status });
      return response;
    } catch (error) {
      console.error('Update user status failed:', error);
      throw error;
    }
  },

  // Update user profile
  updateUser: async (id: string, updates: any) => {
    try {
      const response = await api.put(`/api/auth/admin/users/${id}`, updates);
      return response;
    } catch (error) {
      console.error('Update user failed:', error);
      throw error;
    }
  },

  // Delete user
  deleteUser: async (id: string) => {
    try {
      const response = await api.delete(`/api/auth/admin/users/${id}`);
      return response;
    } catch (error) {
      console.error('Delete user failed:', error);
      throw error;
    }
  },

  // Get all centers
  getAllCenters: async (params?: { page?: number; limit?: number; status?: string; search?: string }) => {
    try {
      const response = await api.get('/api/auth/admin/centers', { params });
      return response;
    } catch (error) {
      console.error('Get all centers failed:', error);
      throw error;
    }
  },

  // Delete center
  deleteCenter: async (id: string) => {
    try {
      const response = await api.delete(`/api/auth/admin/centers/${id}`);
      return response;
    } catch (error) {
      console.error('Delete center failed:', error);
      throw error;
    }
  },

  // Get all doctor applications for approval
  getDoctorApplications: async (params?: { page?: number; limit?: number; status?: string }) => {
    try {
      const response = await api.get('/api/auth/admin/doctor-applications', { params });
      return response;
    } catch (error) {
      console.error('Get doctor applications failed:', error);
      throw error;
    }
  },

  // Approve/reject doctor application
  reviewDoctorApplication: async (id: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await api.put(`/api/auth/admin/doctor-applications/${id}/${action}`, { notes });
      return response;
    } catch (error) {
      console.error('Review doctor application failed:', error);
      throw error;
    }
  },

  // Approve/reject doctor certificate
  approveDoctorCertificate: async (id: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const response = await api.put(`/api/auth/admin/users/${id}/certificate`, { action, notes });
      return response;
    } catch (error) {
      console.error('Approve/reject doctor certificate failed:', error);
      throw error;
    }
  },

  // Get analytics data
  getAnalytics: async (params?: { start_date?: string; end_date?: string; type?: string }) => {
    try {
      const response = await api.get('/api/auth/admin/analytics', { params });
      return response;
    } catch (error) {
      console.error('Get analytics failed:', error);
      throw error;
    }
  },

  // Get audit logs
  getAuditLogs: async (params?: { page?: number; limit?: number; user_id?: string; action?: string; start_date?: string; end_date?: string }) => {
    try {
      const response = await api.get('/api/auth/admin/audit-logs', { params });
      return response;
    } catch (error) {
      console.error('Get audit logs failed:', error);
      throw error;
    }
  },
};

// Export the main API client for custom requests
export { apiClient };
export default api;
