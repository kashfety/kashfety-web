"use client"

import { createContext, useContext, ReactNode, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { clientAuthHelpers, clientDbHelpers } from "../supabase"
import type { User as SupabaseUser, Session } from '@supabase/supabase-js'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: Error | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  register: (userData: { name: string; email: string; password: string; role?: string; firstName?: string; lastName?: string; phone?: string }) => Promise<void>
  isAuthenticated: boolean
  session: Session | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const router = useRouter()

  // Initialize auth state and listen for changes
  useEffect(() => {
    // Get initial session
    clientAuthHelpers.getCurrentSession().then((session) => {
      setSession(session)
      if (session?.user) {
        loadUserProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = clientAuthHelpers.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session)
        setSession(session)

        if (session?.user) {
          // Auto-redirect for SIGNED_IN event if coming from login/signup pages
          const shouldRedirect = event === 'SIGNED_IN'
          await loadUserProfile(session.user, shouldRedirect, session)
        } else {
          setUser(null)
          setIsAuthenticated(false)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Load user profile from database
  const loadUserProfile = async (authUser: SupabaseUser, shouldRedirect: boolean = false, currentSession: any = null) => {
    try {
      setLoading(true)
      console.log('Loading user profile for:', authUser.id, 'shouldRedirect:', shouldRedirect)

      const userProfile = await clientDbHelpers.getUserProfileWithSession(authUser.id, currentSession)
      console.log('User profile loaded:', userProfile)

      if (userProfile) {
        const userData = {
          id: authUser.id,
          name: userProfile.name || authUser.user_metadata?.name || '',
          email: userProfile.email || authUser.email || '',
          role: userProfile.role || 'patient'
        }

        console.log('Setting user data:', userData)
        setUser(userData)
        setIsAuthenticated(true)

        // Only redirect if explicitly requested and not already on a dashboard page
        if (shouldRedirect && typeof window !== 'undefined') {
          const currentPath = window.location.pathname
          const urlParams = new URLSearchParams(window.location.search)
          const redirectParam = urlParams.get('redirect')

          // Check if there's a booking redirect
          if (redirectParam === 'booking') {
            console.log('Redirecting back to home for booking completion')
            // The booking modal will be opened by the stored booking data
            router.push('/')
            return
          }

          const dashboardPath = getDashboardPath(userProfile.role || 'patient')

          console.log(`Current path: ${currentPath}, Dashboard path: ${dashboardPath}`)

          // Only redirect if not already on the correct dashboard
          if (currentPath === '/login' || currentPath === '/signup' || currentPath === '/') {
            console.log(`Auto-redirecting ${userProfile.role} from ${currentPath} to ${dashboardPath}`)
            router.push(dashboardPath)
          } else {
            console.log('Not redirecting - already on appropriate page')
          }
        } else {
          console.log('Not redirecting - shouldRedirect:', shouldRedirect, 'window available:', typeof window !== 'undefined')
        }
      } else {
        console.error('User profile not found for:', authUser.id)
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (err) {
      console.error('Error loading user profile:', err)
      setError(err instanceof Error ? err : new Error('Failed to load user profile'))
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    setLoading(true)
    setError(null)

    try {
      console.log('Starting login process...')
      const { user: authUser, session } = await clientAuthHelpers.signIn(email, password)

      if (!authUser) {
        throw new Error('Login failed - no user returned')
      }

      console.log('Auth successful, loading user profile...')
      setSession(session)

      // The auth state change listener will handle the redirect automatically
      // We don't need to manually redirect here to avoid race conditions

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed')
      console.error('Login error:', error)
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
      await clientAuthHelpers.signOut()
      setUser(null)
      setSession(null)
      setIsAuthenticated(false)

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
    name: string;
    email: string;
    password: string;
    role?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  }) => {
    setLoading(true)
    setError(null)

    try {
      // Call backend API for registration (which handles both Supabase auth and database)
      // Normalize API URL to avoid double slashes
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
      const baseUrl = apiUrl.replace(/\/$/, '')
      const response = await fetch(`${baseUrl}/users/signup`, {
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

      // After successful registration, sign in the user
      await login(userData.email, userData.password)

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
        return '/doctor-dashboard'
      case 'patient':
      default:
        return '/' // Redirect patients to the new landing page
    }
  }

  const value = {
    user,
    session,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
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
