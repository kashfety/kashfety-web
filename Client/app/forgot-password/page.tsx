"use client"

import { useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useLocale } from "@/components/providers/locale-provider"

export default function ForgotPasswordPage() {
  const { t } = useLocale()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<boolean>(false)
  const [email, setEmail] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email) {
      setError("Email address is required")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      // Log reset URL in development
      if (data.resetUrl) {
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || t("an_error_occurred"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <div className="flex flex-col items-center justify-center px-6 py-8 mx-auto md:h-screen lg:py-0">
        <div className="w-full bg-white rounded-lg shadow-xl md:mt-0 sm:max-w-md xl:p-0">
          <div className="p-6 space-y-4 md:space-y-6 sm:p-8">
            <div className="flex flex-col items-center">
              <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                {t("reset_your_password")}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {t("reset_password_desc")}
              </p>
            </div>

            {error && (
              <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
                <span className="font-medium">{t("error_label")}:</span> {error}
              </div>
            )}

            {success ? (
              <div>
                <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
                  <span className="font-medium">{t("success_label")}!</span> {t("reset_email_sent").replace("{email}", email)}
                </div>
                <div className="mt-4 text-center">
                  <Link href="/login" className="font-medium text-blue-600 hover:underline">
                    {t("return_to_login")}
                  </Link>
                </div>
              </div>
            ) : (
              <form className="space-y-4 md:space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className="block mb-2 text-sm font-medium text-gray-900">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    className="bg-gray-50 border border-gray-300 text-gray-900 sm:text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full text-white ${isLoading ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"
                    } focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center`}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>

                <p className="text-sm font-light text-gray-500 text-center">
                  <Link href="/login" className="font-medium text-blue-600 hover:underline">
                    Back to login
                  </Link>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
