"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useLocale } from '@/components/providers/locale-provider'

interface OTPVerificationProps {
  email: string
  onVerificationSuccess: (session: any) => void
  onBack: () => void
}

export default function OTPVerification({ email, onVerificationSuccess, onBack }: OTPVerificationProps) {
  const [otp, setOtp] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { t } = useLocale()

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!otp.trim() || otp.length !== 6) {
      setError(t('otp_invalid_length') || 'Please enter a valid 6-digit code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      console.log('Verifying OTP for email:', email, 'with code:', otp)
      
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email' // Use email type for OTP verification (as per docs)
      })

      console.log('OTP verification response:', { data, error })

      if (error) {
        console.error('OTP verification error:', error)
        if (error.message.includes('expired')) {
          setError(t('otp_expired') || 'Verification code has expired. Please request a new one.')
        } else if (error.message.includes('invalid')) {
          setError(t('otp_invalid') || 'Invalid verification code. Please check and try again.')
        } else {
          setError(error.message || t('otp_verification_failed') || 'Verification failed')
        }
        return
      }

      // Check if we have session or user data
      if (data.session || data.user) {
        setSuccess(t('otp_verification_success') || 'Email verified successfully!')
        console.log('✅ Passing verification data:', data);
        // Pass the complete data object which contains session/user info
        onVerificationSuccess(data)
      } else {
        setError(t('otp_verification_failed') || 'Verification failed. Please try again.')
      }

    } catch (err: any) {
      console.error('OTP verification error:', err)
      setError(err.message || t('otp_verification_failed') || 'Invalid verification code')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    setIsResending(true)
    setError('')
    setSuccess('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true
        }
      })

      if (error) {
        throw error
      }

      setSuccess(t('otp_resent') || 'Verification code resent to your email')
    } catch (err: any) {
      console.error('Resend OTP error:', err)
      setError(err.message || t('otp_resend_failed') || 'Failed to resend verification code')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Animated Background Elements */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2 }}
      >
        <div className="absolute top-10 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-32 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex justify-center">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white mb-6 shadow-2xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 7.89a2 2 0 002.82 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </motion.div>
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-3 text-center text-3xl font-extrabold text-white"
        >
          {t('otp_verification_title') || 'Verify Your Email'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-2 text-center text-sm text-gray-300"
        >
          {t('otp_verification_subtitle') || `We've sent a verification code to:`}
          <br />
          <span className="font-medium text-emerald-400">{email}</span>
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-white/10 backdrop-blur-lg py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-white/20">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-4 bg-red-500/20 border-l-4 border-red-400 p-4 rounded-lg backdrop-blur-sm"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-200">{error}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ duration: 0.3 }}
                className="mb-4 bg-green-500/20 border-l-4 border-green-400 p-4 rounded-lg backdrop-blur-sm"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-200">{success}</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="space-y-6"
            onSubmit={handleVerifyOTP}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <label htmlFor="otp" className="block text-sm font-medium text-gray-200">
                {t('otp_verification_code') || 'Verification Code'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="otp"
                  name="otp"
                  type="text"
                  maxLength={6}
                  required
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(value)
                    if (error) setError('')
                  }}
                  placeholder={t('otp_placeholder') || 'Enter 6-digit code'}
                  className="appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 sm:text-sm transition-all text-center text-lg tracking-widest"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="space-y-4"
            >
              <motion.button
                type="submit"
                disabled={isLoading || otp.length !== 6}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-400 transition-all ${isLoading || otp.length !== 6 ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  t('otp_verify_button') || 'Verify Email'
                )}
              </motion.button>

              <div className="flex items-center justify-between text-sm">
                <motion.button
                  type="button"
                  onClick={onBack}
                  whileHover={{ scale: 1.05 }}
                  className="font-medium text-gray-300 hover:text-emerald-300 transition-colors"
                >
                  {t('otp_back_button') || '← Back to signup'}
                </motion.button>

                <motion.button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResending}
                  whileHover={{ scale: 1.05 }}
                  className="font-medium text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
                >
                  {isResending ? (
                    <span className="flex items-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full mr-2"
                      />
                      {t('otp_resending') || 'Resending...'}
                    </span>
                  ) : (
                    t('otp_resend_button') || 'Resend code'
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </div>
  )
}