"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "@/components/providers/locale-provider"

interface User {
  id: string
  name: string
  name_ar?: string
  first_name?: string
  last_name?: string
  first_name_ar?: string
  last_name_ar?: string
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
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const router = useRouter()
  const { t } = useLocale()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('auth_user')


        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser)

          setToken(storedToken)
          setUser(userData)
          setIsAuthenticated(true)

          // Verify token is still valid
          await verifyToken(storedToken)
        } else {
        }
      } catch (err) {
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


      if (!response.ok) {
        // If we get a 403, the token is invalid - clear it
        if (response.status === 403) {
          localStorage.removeItem('auth_token')
          localStorage.removeItem('auth_user')
          setUser(null)
          setIsAuthenticated(false)
          return
        }
        throw new Error('Token verification failed')
      }

      const result = await response.json()

      if (result.message === 'Token is valid') {
        // Token is valid, update user data from the verification response
        if (result.user) {

          // Construct full name properly - prioritize 'name' field, fallback to first/last names
          let fullName = result.user.name;
          if (!fullName && (result.user.first_name || result.user.last_name)) {
            fullName = `${result.user.first_name || ''} ${result.user.last_name || ''}`.trim();
          }

          const updatedUser = {
            id: result.user.id,
            name: fullName || 'User',
            name_ar: result.user.name_ar,
            first_name: result.user.first_name,
            last_name: result.user.last_name,
            first_name_ar: result.user.first_name_ar,
            last_name_ar: result.user.last_name_ar,
            phone: result.user.phone,
            email: result.user.email,
            role: result.user.role,
            center_id: result.user.center_id
          }

          setUser(updatedUser)
          localStorage.setItem('auth_user', JSON.stringify(updatedUser))
        }
      } else {
        throw new Error('Token invalid')
      }
    } catch (err) {

      // For development, don't logout if token verification fails
      // This allows the app to continue working even if the backend verify endpoint isn't implemented

      // Continue with stored user data instead of logging out
    }
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      // Use Next.js API route (preferred) or fallback to backend server
      // Next.js API routes work without a separate backend server
      const useNextApi = !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_USE_NEXT_API !== '0'

      let loginUrl: string

      if (useNextApi) {
        // Use Next.js API route - works without backend server
        loginUrl = '/api/auth/login'
      } else {
        // Fallback to backend server if explicitly configured
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

        // Handle both cases: URL with or without /api
        let baseUrl: string
        if (apiUrl.includes('/api')) {
          baseUrl = apiUrl.replace(/\/api\/?$/, '') + '/api'
        } else {
          baseUrl = apiUrl.replace(/\/$/, '') + '/api'
        }

        loginUrl = `${baseUrl}/auth/login`
      }

      let response: Response
      try {
        response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include', // Important for CORS with credentials
        })
      } catch (fetchError) {
        // Handle network errors (server not running, CORS, etc.)
        const errorMessage = fetchError instanceof Error
          ? fetchError.message
          : 'Network error'

        // Provide more helpful error message
        if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
          if (useNextApi) {
            throw new Error(
              t('err_cannot_connect_login')
            )
          } else {
            throw new Error(
              `Cannot connect to the server. Please ensure the backend server is running at ${loginUrl}. ` +
              `You can also set NEXT_PUBLIC_USE_NEXT_API=1 to use Next.js API routes instead.`
            )
          }
        }
        throw new Error(`Login request failed: ${errorMessage}`)
      }

      // Check if response is ok before trying to parse JSON
      let result
      try {
        result = await response.json()
      } catch (parseError) {
        const text = await response.text()
        throw new Error(`Server returned invalid response (${response.status}): ${text.substring(0, 200)}`)
      }


      if (!response.ok) {
        const errorMessage = result.error || result.message || `Login failed with status ${response.status}`

        // If doctor needs to upload certificate, store temporary token for upload
        if (result.requires_certificate_upload && result.certificate_status === 'not_uploaded') {
          localStorage.setItem('doctor_certificate_status', 'not_uploaded')
          // Store temporary token for certificate upload
          if (result.temp_token) {
            localStorage.setItem('temp_doctor_token', result.temp_token)
          }
        }

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

        if (result.user.role === 'doctor') {
        }

        // Redirect based on user role
        const dashboardPath = getDashboardPath(result.user.role)
        router.push(dashboardPath)
      } else {
        throw new Error(t('err_invalid_server_response'))
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('err_login_failed'))
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


      // Use Next.js API route (preferred) or fallback to backend server
      const useNextApi = !process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_USE_NEXT_API !== '0'

      let registerUrl: string

      if (useNextApi) {
        // Use Next.js API route - works without backend server
        registerUrl = '/api/auth/register-verified'
      } else {
        // Fallback to backend server if explicitly configured
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

        // Handle both cases: URL with or without /api
        let baseUrl: string
        if (apiUrl.includes('/api')) {
          baseUrl = apiUrl.replace(/\/api\/?$/, '') + '/api'
        } else {
          baseUrl = apiUrl.replace(/\/$/, '') + '/api'
        }

        registerUrl = `${baseUrl}/auth/register`
      }

      const response = await fetch(registerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
        credentials: 'include', // Important for CORS with credentials
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || result.message || t('err_registration_failed'))
      }

      if ((result.message && result.message.includes('registered successfully')) || result.success) {
        // After successful registration, log in the user
        await login(userData.phone, userData.password)
      } else {
        throw new Error(t('err_registration_failed'))
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error(t('err_registration_failed'))
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

  const refreshUser = async (): Promise<void> => {
    const storedToken = localStorage.getItem('auth_token')
    if (storedToken) {
      await verifyToken(storedToken)
    }
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
    refreshUser,
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
