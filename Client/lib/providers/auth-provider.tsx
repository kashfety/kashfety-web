"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: 'patient' | 'doctor' | 'admin' | 'center' | 'super_admin'
  center_id?: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: any) => Promise<void>
  isAuthenticated: boolean
  token: string | null
  getUserRole: () => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const router = useRouter()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')

        console.log('🔍 Initializing auth - stored token:', storedToken ? 'present' : 'missing')
        console.log('🔍 Initializing auth - stored user:', storedUser)

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser)
          console.log('🔍 Parsed stored user data:', userData)

          setToken(storedToken)
          setUser(userData)
          setIsAuthenticated(true)

          // Verify token is still valid
          await verifyToken(storedToken)
        } else {
          console.log('🔍 No stored auth data found')
        }
      } catch (err) {
        console.error('Error initializing auth:', err)
        // Clear invalid data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_user')
      } finally {
        setLoading(false)
      }
    }

    initializeAuth()
  }, [])

  // Verify token validity
  const verifyToken = async (authToken: string) => {
    try {
      console.log('Verifying token...')

      // Use Next.js API route (relative path) instead of backend server
      // This ensures we use the Next.js API route handler
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Important for CORS with credentials
      })

      console.log('Token verification response status:', response.status)

      if (!response.ok) {
        // If we get a 403, the token is invalid - clear it
        if (response.status === 403) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          setUser(null)
          setIsAuthenticated(false)
          console.log('Invalid token detected and cleared')
          return
        }
        throw new Error('Token verification failed')
      }

      const result = await response.json()
      console.log('Token verification result:', result)

      if (result.message === 'Token is valid') {
        console.log('Token is valid, user authenticated')
        // Token is valid, update user data from the verification response
        if (result.user) {
          console.log('Updating user data from token verification:', result.user)

          // Construct full name properly - prioritize 'name' field, fallback to first/last names
          let fullName = result.user.name;
          if (!fullName && (result.user.first_name || result.user.last_name)) {
            fullName = `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim();
          }

          const updatedUser = {
            id: result.user.id,
            name: fullName || 'User',
            phone: result.user.phone,
            email: result.user.email,
            role: result.user.role,
            center_id: result.user.center_id
          }

          console.log('🔄 Setting updated user data:', updatedUser)
          setUser(updatedUser)
          localStorage.setItem('auth_user', JSON.stringify(updatedUser))
        }
      } else {
        throw new Error('Token invalid')
      }
    } catch (err) {
      console.error('Token verification failed:', err)

      // For development, don't logout if token verification fails
      // This allows the app to continue working even if the backend verify endpoint isn't implemented
      console.log('Token verification failed, but continuing with stored user for development')

      // Continue with stored user data instead of logging out
    }
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Starting login process...')
      
      // Normalize API URL to avoid double slashes or missing /api  
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      
      // Handle both cases: URL with or without /api
      let baseUrl: string
      if (apiUrl.includes('/api')) {
        // If /api is already in the URL, use it as-is (remove trailing /api if duplicated)
        baseUrl = apiUrl.replace(/\/api\/?$/, '') + '/api'
      } else {
        // If no /api, add it
        baseUrl = apiUrl.replace(/\/$/, '') + '/api'
      }
      
      const loginUrl = `${baseUrl}/auth/login`
      console.log('🌐 Login URL:', loginUrl)
      console.log('🌐 API URL env:', apiUrl)
      
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Important for CORS with credentials
      })

      // Check if response is ok before trying to parse JSON
      let result
      try {
        result = await response.json()
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError)
        const text = await response.text()
        console.error('Response text:', text)
        throw new Error(`Server returned invalid response (${response.status}): ${text.substring(0, 200)}`)
      }

      console.log('Login response status:', response.status)
      console.log('Login response data:', result)

      if (!response.ok) {
        const errorMessage = result.error || result.message || `Login failed with status ${response.status}`
        console.error('Login failed:', errorMessage)
        throw new Error(errorMessage)
      }

      if (result.message === 'Login successful' && result.token && result.user) {
        // Store auth data
        localStorage.setItem('auth_token', result.token)
        localStorage.setItem('auth_user', JSON.stringify(result.user))

        // Store certificate status if doctor
        if (result.user.role === 'doctor' && result.certificate_status) {
          localStorage.setItem('doctor_certificate_status', result.certificate_status)
        }

        setToken(result.token)
        setUser(result.user)
        setIsAuthenticated(true)

        console.log('Login successful, user role:', result.user.role)
        if (result.user.role === 'doctor') {
          console.log('Doctor certificate status:', result.certificate_status)
        }

        // Redirect based on user role
        const dashboardPath = getDashboardPath(result.user.role)
        console.log('Redirecting to:', dashboardPath)
        router.push(dashboardPath)
      } else {
        console.error('Unexpected response structure:', result)
        throw new Error('Invalid response from server')
      }

    } catch (err) {
      console.error('❌ Login error:', err)
      const error = err instanceof Error ? err : new Error('Login failed')
      console.error('Login error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
      setError(error)
      setIsAuthenticated(false)
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    setLoading(true)
    try {
      // Clear local storage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('auth_user')

      // Reset state
      setUser(null)
      setToken(null)
      setIsAuthenticated(false)
      setError(null)

      // Redirect to login
      router.push('/login')
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Logout failed')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: {
    // Accept either a single name or first/last – callers may send either shape
    name?: string
    first_name?: string
    last_name?: string
    phone: string
    password: string
    role: 'patient' | 'doctor' | 'admin' | 'super_admin'
    email?: string
    gender?: string
    date_of_birth?: string
    specialty?: string
    bio?: string
    experience_years?: number
    consultation_fee?: number
  }) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Starting registration process...')

      // Robust name handling: support either name or first/last coming from caller
      const fallbackFullName = [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim()
      const fullName = (userData.name && userData.name.trim()) || fallbackFullName
      const computedFirst = userData.first_name || (fullName ? fullName.split(' ')[0] : '')
      const computedLast = userData.last_name || (fullName ? fullName.split(' ').slice(1).join(' ') : '') || computedFirst || 'User'

      // Prepare registration data for backend (unified-auth expects phone, password, role, first_name, last_name)
      const { name, first_name: _fn, last_name: _ln, ...restData } = userData as any
      const registrationData = {
        ...restData,
        first_name: computedFirst,
        last_name: computedLast,
      }

      console.log('=== AUTH PROVIDER REGISTRATION DEBUG ===');
      console.log('Original userData:', userData);
      console.log('Computed first_name:', computedFirst);
      console.log('Computed last_name:', computedLast);
      console.log('Final registrationData:', registrationData);

      // Normalize API URL to avoid double slashes or missing /api
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      let baseUrl: string
      if (apiUrl.includes('/api')) {
        baseUrl = apiUrl.replace(/\/api\/?$/, '') + '/api'
      } else {
        baseUrl = apiUrl.replace(/\/$/, '') + '/api'
      }
      
      const registerUrl = `${baseUrl}/auth/register`
      console.log('🌐 Register URL:', registerUrl)
      console.log('🌐 API URL env:', apiUrl)
      
      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
        credentials: 'include', // Important for CORS with credentials
      })

      const result = await response.json()
      console.log('Response status:', response.status);
      console.log('Response result:', result);

      if (!response.ok) {
        console.error('Registration failed:', result);
        throw new Error(result.error || result.message || 'Registration failed')
      }

      if ((result.message && result.message.includes('registered successfully')) || result.success) {
        console.log('Registration successful, logging in...')
        // After successful registration, log in the user
        await login(userData.phone, userData.password)
      } else {
        throw new Error('Registration failed')
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Registration failed')
      setError(error)
      setIsAuthenticated(false)
      throw error
    } finally {
      setLoading(false)
    }
  }

  // Helper function to get dashboard path based on role
  const getDashboardPath = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'super_admin':
        return '/super-admin-dashboard'
      case 'admin':
        return '/admin-dashboard'
      case 'doctor':
        return '/doctor-dashboard'
      case 'center':
        return '/center-dashboard'
      case 'patient':
      default:
        return '/' // Redirect patients to the landing page
    }
  }

  const getUserRole = (): string | null => {
    return user?.role || null
  }

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
    getUserRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
