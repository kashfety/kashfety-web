"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()

  // Check if user is authenticated (from password reset email)
  useEffect(() => {
    const checkAuth = async () => {
      // First check for hash fragments (for password recovery tokens)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const type = hashParams.get('type')

      console.log('Hash params:', { accessToken: accessToken ? 'present' : 'none', type })

      // If we have an access token from the URL, set the session
      if (accessToken && type === 'recovery') {
        console.log('Setting session from recovery token')
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: hashParams.get('refresh_token') || ''
        })
        
        if (error) {
          console.error('Error setting session:', error)
          setError("Invalid or expired reset link. Please request a new password reset.")
          setTimeout(() => {
            router.push('/forgot-password')
          }, 3000)
          return
        }
        
        console.log('Session set successfully:', data.session?.user?.email)
        setIsAuthenticated(true)
      } else {
        // Check if we already have a session
        const { data: { session } } = await supabase.auth.getSession()
        console.log('Existing session:', session?.user?.email || 'none')
        
        if (!session) {
          setError("Invalid or expired reset link. Please request a new password reset.")
          setTimeout(() => {
            router.push('/forgot-password')
          }, 3000)
        } else {
          setIsAuthenticated(true)
        }
      }
    }
    checkAuth()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || !confirmPassword) {
      setError("Please fill in all fields")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setIsLoading(true)

    try {
      console.log('Attempting to update password...')
      
      // Verify we have a session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session. Please click the reset link from your email again.')
      }
      
      console.log('Current user:', session.user.email)
      
      const { data, error: updateError } = await supabase.auth.updateUser({
        password: password
      })

      if (updateError) {
        console.error('Update error:', updateError)
        throw updateError
      }

      console.log('Password updated successfully for user:', data.user?.email)
      setSuccess(true)
      
      // Sign out to force fresh login with new password
      await supabase.auth.signOut()
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login')
      }, 3000)
      
    } catch (err: any) {
      console.error("Password update error:", err)
      setError(err.message || "An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  if (!isAuthenticated && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <div className="w-full bg-white rounded-lg shadow-xl md:mt-0 sm:max-w-md xl:p-0">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                Update your password
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Enter your new password below
              </p>
            </div>

            {error && (
              <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                <span className="font-medium">Error:</span> {error}
              </div>
            )}

            {success ? (
              <div>
                <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
                  <span className="font-medium">Success!</span> Your password has been updated. Redirecting to login...
                </div>
              </div>
            ) : isAuthenticated ? (
              <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-900">
                    New Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    id="password"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block mb-2 text-sm font-medium text-gray-900">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    id="confirmPassword"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5"
                    placeholder="••••••••"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full text-white ${
                    isLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                  } focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Updating...
                    </div>
                  ) : (
                    "Update Password"
                  )}
                </button>

                <p className="text-sm font-light text-gray-500 text-center">
                  <Link href="/login" className="font-medium text-blue-600 hover:underline">
                    Back to login
                  </Link>
                </p>
              </form>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
