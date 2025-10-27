"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/providers/auth-provider'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/theme-toggle'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { useLocale } from '@/components/providers/locale-provider'
import { useTheme } from 'next-themes'

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { t } = useLocale()
  const { theme } = useTheme()

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password validation function
  const validatePassword = (password: string) => {
    return password.length >= 6
  }

  useEffect(() => {
    document.title = `${t('auth_sign_in_title') || 'Sign in to your account'} | Kashfety`
  }, [t])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    setPasswordError('')
    setIsLoading(true)

    // Validate email
    if (!email.trim()) {
      setEmailError(t('auth_email_required') || 'Email is required')
      setIsLoading(false)
      return
    }

    if (!validateEmail(email)) {
      setEmailError(t('auth_email_invalid') || 'Please enter a valid email address')
      setIsLoading(false)
      return
    }

    // Validate password
    if (!password.trim()) {
      setPasswordError(t('auth_password_required') || 'Password is required')
      setIsLoading(false)
      return
    }

    if (!validatePassword(password)) {
      setPasswordError(t('auth_password_min_length') || 'Password must be at least 6 characters long')
      setIsLoading(false)
      return
    }

    try {
      await login(email, password)
    } catch (err: any) {
      setError(err.message || t('auth_invalid_credentials') || 'Invalid email or password')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4DBCC4]/20 via-background to-[#4DBCC4]/10 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Global Toggles */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>

      {/* Animated Background Elements */}
      <motion.div
        className="absolute inset-0 opacity-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.2 }}
        transition={{ duration: 2 }}
      >
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-[#4DBCC4] to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute top-32 right-10 w-72 h-72 bg-gradient-to-br from-[#4DBCC4]/70 to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-32 w-72 h-72 bg-gradient-to-br from-[#4DBCC4]/50 to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="flex justify-center">
          {/* Logo */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring", stiffness: 100 }}
            whileHover={{ scale: 1.05 }}
            className="relative h-16 w-32 mb-6"
          >
            <Image
              src={theme === 'dark' ? "/logo/branding-dark.png" : "/logo/branding-light.png"}
              alt="Kashfety Logo"
              fill
              className="object-contain"
              priority
            />
          </motion.div>
        </div>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-3 text-center text-3xl font-extrabold text-foreground"
        >
          {t('auth_sign_in_title') || 'Sign in to your account'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          {(t('or') || 'Or') + ' '}
          <Link href="/signup" className="font-medium text-[#4DBCC4] dark:text-[#2a5f6b] hover:text-[#3da8b0] dark:hover:text-[#4DBCC4] transition-colors">
            {t('auth_create_account_link') || 'create a new account'}
          </Link>
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10"
      >
        <div className="bg-background/80 backdrop-blur-lg py-8 px-4 shadow-2xl sm:rounded-2xl sm:px-10 border border-border">
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
          </AnimatePresence>

          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="space-y-6"
            onSubmit={handleSubmit}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <label htmlFor="email" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_email_label') || 'Email Address'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (emailError) setEmailError('')
                  }}
                  placeholder={t('auth_email_placeholder') || 'Enter your email address'}
                  className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 sm:text-sm transition-all`}
                />
                {emailError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-400"
                  >
                    {emailError}
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <label htmlFor="password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_password_label') || 'Password'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (passwordError) setPasswordError('')
                  }}
                  placeholder={t('auth_password_placeholder') || 'Enter your password'}
                  className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 sm:text-sm transition-all`}
                />
                {passwordError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-400"
                  >
                    {passwordError}
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center">
                <motion.input
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-emerald-400 focus:ring-emerald-400 border-white/30 rounded bg-white/10 backdrop-blur-sm"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
                  {t('auth_remember_me') || 'Remember me'}
                </label>
              </div>

              <div className="text-sm">
                <motion.a
                  href="#"
                  whileHover={{ scale: 1.05 }}
                  className="font-medium text-[#4DBCC4] hover:text-[#4DBCC4]/80 dark:text-[#4DBCC4] dark:hover:text-[#4DBCC4]/80 transition-colors"
                >
                  {t('auth_forgot_password') || 'Forgot your password?'}
                </motion.a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.3 }}
            >
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)" }}
                whileTap={{ scale: 0.98 }}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-[#4DBCC4] dark:bg-[#2a5f6b] hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4DBCC4]/50 dark:focus:ring-[#2a5f6b]/50 transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  t('auth_sign_in_submit') || 'Sign in'
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>
    </div>
  )
}
