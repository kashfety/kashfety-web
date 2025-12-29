"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: 'patient' | 'doctor'
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  login: (phone: string, password: string) => Promise<void>
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

        if (storedToken && storedUser) {
          const userData = JSON.parse(storedUser)
          setToken(storedToken)
          setUser(userData)
          setIsAuthenticated(true)

          // Verify token is still valid
          await verifyToken(storedToken)
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Token verification failed')
      }

      const result = await response.json()
      if (result.success) {
        // Token is valid, update user data if provided
        if (result.user) {
          setUser(result.user)
          localStorage.setItem('auth_user', JSON.stringify(result.user))
        }
      } else {
        throw new Error('Token invalid')
      }
    } catch (err) {
      await logout()
    }
  }

  const login = async (phone: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      // Normalize API URL to avoid double slashes or missing /api
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, password }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Login failed')
      }

      if (result.success && result.token && result.user) {
        // Store auth data
        localStorage.setItem('auth_token', result.token)
        localStorage.setItem('auth_user', JSON.stringify(result.user))

        setToken(result.token)
        setUser(result.user)
        setIsAuthenticated(true)


        // Redirect based on user role
        const dashboardPath = getDashboardPath(result.user.role)
        router.push(dashboardPath)
      } else {
        throw new Error('Invalid response from server')
      }

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed')
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
    name: string
    phone: string
    password: string
    role: 'patient' | 'doctor'
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
      // Normalize API URL to avoid double slashes or missing /api
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`
      const response = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Registration failed')
      }

      if (result.success) {
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
      case 'doctor':
        return '/doctor-dashboard'
      case 'admin':
        return '/admin-dashboard'
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
