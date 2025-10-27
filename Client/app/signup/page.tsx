"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/providers/auth-provider'
import MedicalRecordsForm from '@/components/MedicalRecordsForm'
import DoctorCertificateUpload from '@/components/DoctorCertificateUpload'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from '@/components/theme-toggle'
import { LocaleSwitcher } from '@/components/ui/locale-switcher'
import { useLocale } from '@/components/providers/locale-provider'
import { useTheme } from 'next-themes'
import CountryCodeSelector, { countries, type Country } from '@/components/CountryCodeSelector'
import OTPVerification from '@/components/OTPVerification'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const { register, login } = useAuth()
  const { t } = useLocale()
  const { theme } = useTheme()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showMedicalForm, setShowMedicalForm] = useState(false)
  const [showDoctorCertificateForm, setShowDoctorCertificateForm] = useState(false)
  const [registeredPatient, setRegisteredPatient] = useState<{ id: string, name: string } | null>(null)
  const [registeredDoctor, setRegisteredDoctor] = useState<{ id: string, name: string, token: string } | null>(null)
  const [isSubmittingMedicalRecords, setIsSubmittingMedicalRecords] = useState(false)
  const [specialties, setSpecialties] = useState<{ id: string, name: string, description: string }[]>([])
  const [loadingSpecialties, setLoadingSpecialties] = useState(false)
  
  // OTP verification state
  const [showOTPVerification, setShowOTPVerification] = useState(false)
  const [pendingUserData, setPendingUserData] = useState<any>(null)
  
  // Validation state
  const [validationErrors, setValidationErrors] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    specialty: '',
    gender: '',
    dateOfBirth: ''
  })
  
  // Country code selector state
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0])
  const [phoneNumber, setPhoneNumber] = useState('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'patient', // Default role
    phone: '', // Added phone field
    gender: '', // Added gender field
    date_of_birth: '', // Added date of birth field
    // Doctor-specific fields
    specialty: '',
    bio: '',
    experience_years: '',
    consultation_fee: '',
    // Center-specific fields
    center_address: '',
    center_type: 'generic',
    offers_labs: false,
    offers_imaging: false,
  })

  // Validation functions
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const validatePassword = (password: string) => {
    return password.length >= 8 && /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
  }

  const validateName = (name: string) => {
    return name.trim().length >= 2 && /^[a-zA-Z\s]+$/.test(name.trim())
  }

  const validatePhoneNumber = (phone: string, countryCode: string) => {
    const cleanPhone = phone.replace(/[^\d]/g, '')
    switch (countryCode) {
      case '+1': return /^\d{10}$/.test(cleanPhone)
      case '+44': return /^\d{10,11}$/.test(cleanPhone)
      case '+49': return /^\d{10,12}$/.test(cleanPhone)
      case '+33': return /^\d{9,10}$/.test(cleanPhone)
      case '+91': return /^\d{10}$/.test(cleanPhone)
      case '+966': return /^\d{9}$/.test(cleanPhone)
      case '+971': return /^\d{9}$/.test(cleanPhone)
      case '+964': return /^\d{10}$/.test(cleanPhone)
      default: return /^\d{7,15}$/.test(cleanPhone)
    }
  }

  const clearValidationError = (field: string) => {
    setValidationErrors(prev => ({ ...prev, [field]: '' }))
  }

  useEffect(() => {
    document.title = `${t('auth_create_title') || 'Create your account'} | Kashfety`
  }, [t])

  // Fetch specialties when role is doctor
  useEffect(() => {
    if (formData.role === 'doctor') {
      fetchSpecialties()
    }
  }, [formData.role])

  const fetchSpecialties = async () => {
    try {
      setLoadingSpecialties(true)
      const response = await fetch('/api/specialties')
      if (response.ok) {
        const data = await response.json()
        setSpecialties(data.specialties)
      } else {
        console.error('Failed to fetch specialties')
      }
    } catch (error) {
      console.error('Error fetching specialties:', error)
    } finally {
      setLoadingSpecialties(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    clearValidationError(name)
  }

  const handlePhoneChange = (phone: string) => {
    setPhoneNumber(phone)
    setFormData(prev => ({ ...prev, phone: `${selectedCountry.phoneCode}${phone}` }))
    clearValidationError('phone')
  }

  const handleCountryChange = (country: Country) => {
    setSelectedCountry(country)
    setFormData(prev => ({ ...prev, phone: `${country.phoneCode}${phoneNumber}` }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setIsLoading(true)

    // Reset validation errors
    setValidationErrors({
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      specialty: '',
      gender: '',
      dateOfBirth: ''
    })

    let hasErrors = false

    // Validate name
    if (!formData.name.trim()) {
      setValidationErrors(prev => ({ ...prev, name: t('auth_full_name_required') || 'Full name is required' }))
      hasErrors = true
    } else if (!validateName(formData.name)) {
      setValidationErrors(prev => ({ ...prev, name: t('auth_name_invalid') || 'Name must contain only letters and be at least 2 characters' }))
      hasErrors = true
    }

    // Validate email
    if (!formData.email.trim()) {
      setValidationErrors(prev => ({ ...prev, email: t('auth_email_required') || 'Email is required' }))
      hasErrors = true
    } else if (!validateEmail(formData.email)) {
      setValidationErrors(prev => ({ ...prev, email: t('auth_email_invalid') || 'Please enter a valid email address' }))
      hasErrors = true
    }

    // Validate phone
    if (!phoneNumber.trim()) {
      setValidationErrors(prev => ({ ...prev, phone: t('auth_phone_required') || 'Phone number is required' }))
      hasErrors = true
    } else if (!validatePhoneNumber(phoneNumber, selectedCountry.phoneCode)) {
      setValidationErrors(prev => ({ ...prev, phone: t('auth_phone_invalid') || `Please enter a valid phone number for ${selectedCountry.name}` }))
      hasErrors = true
    }

    // Validate password
    if (!formData.password.trim()) {
      setValidationErrors(prev => ({ ...prev, password: t('auth_password_required') || 'Password is required' }))
      hasErrors = true
    } else if (!validatePassword(formData.password)) {
      setValidationErrors(prev => ({ ...prev, password: t('auth_password_weak') || 'Password must be at least 8 characters with uppercase, lowercase, and number' }))
      hasErrors = true
    }

    // Validate confirm password
    if (formData.password !== formData.confirmPassword) {
      setValidationErrors(prev => ({ ...prev, confirmPassword: t('passwords_do_not_match') || 'Passwords do not match' }))
      hasErrors = true
    }

    // Validate role-specific fields
    if (formData.role === 'doctor' && !formData.specialty.trim()) {
      setValidationErrors(prev => ({ ...prev, specialty: t('auth_medical_specialty_required') || 'Medical specialty is required for doctors' }))
      hasErrors = true
    }

    if (formData.role === 'center' && !formData.center_address.trim()) {
      setError('Center address is required for medical centers')
      setIsLoading(false)
      return
    }

    if (hasErrors) {
      setIsLoading(false)
      return
    }

    try {
      const nameParts = formData.name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || firstName;

      // Store user data for after OTP verification
      const userData = {
        first_name: firstName,
        last_name: lastName,
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role.toLowerCase(),
        phone: `${selectedCountry.phoneCode}${phoneNumber}`,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        specialty: formData.specialty,
        bio: formData.bio,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
        consultation_fee: formData.consultation_fee ? parseFloat(formData.consultation_fee) : null,
        center_address: formData.center_address,
        center_type: formData.center_type,
        offers_labs: formData.offers_labs,
        offers_imaging: formData.offers_imaging,
      };

      setPendingUserData(userData);

      // Send OTP code using Supabase Auth signInWithOtp (handles both login and signup)
      const { error } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          shouldCreateUser: true, // Allow automatic user creation for signup
          emailRedirectTo: undefined, // We'll handle verification manually
        }
      });

      if (error) {
        throw error;
      }

      setShowOTPVerification(true);
      setSuccess(t('otp_sent_success') || 'Verification code sent to your email!');

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      setError(error.message || t('registration_failed') || 'Registration failed');
    } finally {
      setIsLoading(false)
    }
  }

  // Handle OTP verification success
  const handleOTPVerificationSuccess = async (verificationData: any) => {
    try {
      setIsLoading(true);
      
      console.log('🔍 Full verification data received:', JSON.stringify(verificationData, null, 2));
      
      if (!pendingUserData) {
        throw new Error('No pending user data found');
      }

      // Extract Supabase user ID from verification data - try multiple possible paths
      let supabaseUserId = verificationData?.session?.user?.id || 
                          verificationData?.user?.id || 
                          verificationData?.id;
      
      console.log('🆔 Extracted user ID:', supabaseUserId);
      
      if (!supabaseUserId) {
        console.error('❌ Verification data structure:', verificationData);
        throw new Error('Failed to get user ID from verification data');
      }

      // Create user in custom users table using backend API
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api`;
      
      const response = await fetch(`${baseUrl}/auth/register-verified`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...pendingUserData,
          supabase_user_id: supabaseUserId, // Pass the verified Supabase user ID
          email_verified: true
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || result.message || 'Failed to create user profile');
      }

      // Store auth token and proceed based on role
      if (result.token) {
        localStorage.setItem('auth_token', result.token);
      }

      const role = pendingUserData.role;
      
      if (role === 'patient') {
        setRegisteredPatient({ 
          id: result.user.id, 
          name: result.user.name || pendingUserData.name 
        });
        setShowMedicalForm(true);
        setShowOTPVerification(false);
        setSuccess(t('registration_success') || 'Registration successful! Please complete your medical records.');
      } else if (role === 'doctor') {
        setRegisteredDoctor({ 
          id: result.user.id, 
          name: result.user.name || pendingUserData.name,
          token: result.token || ''
        });
        setShowDoctorCertificateForm(true);
        setShowOTPVerification(false);
        setSuccess(t('registration_success') || 'Registration successful! Please upload your medical certificates for approval.');
      } else {
        // For other roles, redirect to appropriate dashboard
        setShowOTPVerification(false);
        setSuccess(t('registration_success') || 'Registration successful!');
        
        setTimeout(() => {
          if (role === 'center') {
            router.push('/center-dashboard');
          } else if (role === 'admin' || role === 'super_admin') {
            router.push('/admin-dashboard');
          }
        }, 2000);
      }

    } catch (error: any) {
      console.error('❌ Post-verification error:', error);
      setError(error.message || t('registration_failed') || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  // Handle going back from OTP verification
  const handleOTPBackToSignup = () => {
    setShowOTPVerification(false);
    setPendingUserData(null);
    setError('');
    setSuccess('');
  }

  const handleMedicalRecordsComplete = async () => {
    try {
      setIsLoading(true);
      await login(formData.email, formData.password);
    } catch (err: any) {
      setError(t('login_failed_after_records') || 'Medical records saved but login failed. Please try logging in manually.');
    } finally {
      setIsLoading(false);
      setShowMedicalForm(false);
    }
  }

  const handleSkipMedicalRecords = async () => {
    await handleMedicalRecordsComplete();
  }

  const handleMedicalRecordsSubmit = async (medicalData: any) => {
    if (!registeredPatient) return;
    setIsSubmittingMedicalRecords(true);
    try {
      const response = await fetch('http://localhost:5000/api/auth/medical-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ patient_id: registeredPatient.id, ...medicalData })
      });
      if (!response.ok) throw new Error('Failed to submit medical records');
      await handleMedicalRecordsComplete();
    } catch (err: any) {
      setError(t('medical_records_failed') || 'Failed to save medical records. Please try again.');
    } finally {
      setIsSubmittingMedicalRecords(false);
    }
  }

  const handleMedicalRecordsSkip = async () => {
    await handleSkipMedicalRecords();
  }

  const handleCertificateUploadComplete = () => {
    setShowDoctorCertificateForm(false);
    setSuccess('Certificates uploaded successfully! Your account is now pending admin approval. You will be notified once approved.');
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }

  const handleCertificateUploadSkip = () => {
    setShowDoctorCertificateForm(false);
    setSuccess('Registration completed! You can upload certificates later from your dashboard. Note that your account will remain pending until certificates are approved.');
    setTimeout(() => {
      router.push('/login');
    }, 3000);
  }

  // Show OTP verification if needed
  if (showOTPVerification && pendingUserData) {
    return (
      <OTPVerification
        email={pendingUserData.email}
        onVerificationSuccess={handleOTPVerificationSuccess}
        onBack={handleOTPBackToSignup}
      />
    );
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
        <div className="absolute top-10 right-10 w-72 h-72 bg-gradient-to-br from-[#4DBCC4] to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl animate-pulse"></div>
        <div className="absolute bottom-32 left-10 w-72 h-72 bg-gradient-to-br from-[#4DBCC4]/70 to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-[#4DBCC4]/50 to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl animate-pulse" style={{ animationDelay: '4s' }}></div>
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
          {t('auth_create_title') || 'Create your account'}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-2 text-center text-sm text-muted-foreground"
        >
          {(t('or') || 'Or') + ' '}
          <Link href="/login" className="font-medium text-[#4DBCC4] dark:text-[#2a5f6b] hover:text-[#3da8b0] dark:hover:text-[#4DBCC4] transition-colors">
            {t('auth_sign_in_link') || 'sign in to your account'}
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

          <AnimatePresence>
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
            onSubmit={handleSubmit}
          >
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.0 }}
            >
              <label htmlFor="name" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_full_name_label') || 'Full Name'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    handleChange(e)
                    clearValidationError('name')
                  }}
                  className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all ${
                    validationErrors.name ? 'border-red-400 focus:ring-red-400' : 'border-white/30'
                  }`}
                  placeholder={t('auth_name_placeholder') || "John Doe"}
                />
                {validationErrors.name && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-400"
                  >
                    {validationErrors.name}
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
            >
              <label htmlFor="email" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_email_label') || 'Email address'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => {
                    handleChange(e)
                    clearValidationError('email')
                  }}
                  className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all ${
                    validationErrors.email ? 'border-red-400 focus:ring-red-400' : 'border-white/30'
                  }`}
                  placeholder={t('auth_email_placeholder') || "john@example.com"}
                />
                {validationErrors.email && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-400"
                  >
                    {validationErrors.email}
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <CountryCodeSelector
                selectedCountry={selectedCountry}
                onCountryChange={handleCountryChange}
                phoneNumber={phoneNumber}
                onPhoneNumberChange={handlePhoneChange}
                error={validationErrors.phone}
                placeholder={t('auth_phone_placeholder') || "Enter phone number"}
                label={t('auth_phone_label') || 'Phone Number'}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.3 }}
            >
              <label htmlFor="role" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_account_type_label') || 'Account Type'}
              </label>
              <div className="mt-1">
                <motion.select
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="role"
                  name="role"
                  required
                  value={formData.role}
                  onChange={handleChange}
                  className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                  style={{
                    backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg>')}")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em'
                  }}
                >
                  <option value="patient" className="bg-gray-800 text-white">{t('auth_patient') || 'Patient'}</option>
                  <option value="doctor" className="bg-gray-800 text-white">{t('auth_doctor') || 'Doctor'}</option>
                  <option value="center" className="bg-gray-800 text-white">{t('auth_center') || 'Medical Center'}</option>
                  <option value="admin" className="bg-gray-800 text-white">{t('auth_admin') || 'Admin'}</option>
                  <option value="super_admin" className="bg-gray-800 text-white">{t('auth_super_admin') || 'Super Admin'}</option>
                </motion.select>
              </div>
            </motion.div>

            {formData.role === 'patient' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <label htmlFor="gender" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('auth_gender_label') || 'Gender'}
                    </label>
                    <div className="mt-1">
                      <motion.select
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg>')}")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="" className="bg-gray-800 text-white">{t('auth_select_gender') || 'Select Gender'}</option>
                        <option value="male" className="bg-gray-800 text-white">{t('auth_male') || 'Male'}</option>
                        <option value="female" className="bg-gray-800 text-white">{t('auth_female') || 'Female'}</option>
                        <option value="other" className="bg-gray-800 text-white">{t('auth_other') || 'Other'}</option>
                      </motion.select>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label htmlFor="date_of_birth" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('auth_dob_label') || 'Date of Birth'}
                    </label>
                    <div className="mt-1">
                      <motion.input
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="date_of_birth"
                        name="date_of_birth"
                        type="date"
                        value={formData.date_of_birth}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            )}

            {formData.role === 'doctor' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <label htmlFor="specialty" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('auth_medical_specialty_label') || 'Medical Specialty'}
                    </label>
                    <div className="mt-1">
                      <motion.select
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="specialty"
                        name="specialty"
                        required
                        value={formData.specialty}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                        style={{
                          backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clip-rule="evenodd" /></svg>')}")`,
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 0.5rem center',
                          backgroundSize: '1.5em 1.5em'
                        }}
                      >
                        <option value="" className="bg-gray-800 text-white">{t('auth_select_specialty') || 'Select Specialty'}</option>
                        {loadingSpecialties ? (
                          <option disabled className="bg-gray-800 text-white">{t('auth_loading_specialties') || 'Loading specialties...'}</option>
                        ) : (
                          specialties.map((specialty) => (
                            <option key={specialty.id} value={specialty.name} className="bg-gray-800 text-white">
                              {specialty.name}
                            </option>
                          ))
                        )}
                      </motion.select>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label htmlFor="bio" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('auth_professional_bio_label') || 'Professional Bio'}
                    </label>
                    <div className="mt-1">
                      <motion.textarea
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="bio"
                        name="bio"
                        rows={3}
                        required
                        value={formData.bio}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                        placeholder={t('auth_bio_placeholder') || "Brief description of your background and expertise..."}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                  >
                    <label htmlFor="experience_years" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('auth_years_experience_label') || 'Years of Experience'}
                    </label>
                    <div className="mt-1">
                      <motion.input
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="experience_years"
                        name="experience_years"
                        type="number"
                        min="0"
                        max="50"
                        required
                        value={formData.experience_years}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                        placeholder={t('auth_experience_placeholder') || "5"}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                  >
                    <label htmlFor="consultation_fee" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                      {t('auth_consultation_fee_label') || 'Consultation Fee'}
                    </label>
                    <div className="mt-1">
                      <motion.input
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="consultation_fee"
                        name="consultation_fee"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.consultation_fee}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                        placeholder={t('auth_fee_placeholder') || "100.00"}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            )}

            {formData.role === 'center' && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <label htmlFor="center_address" className="block text-sm font-medium text-gray-200">
                      Center Address *
                    </label>
                    <div className="mt-1">
                      <motion.textarea
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="center_address"
                        name="center_address"
                        required
                        rows={3}
                        value={formData.center_address}
                        onChange={handleChange}
                        className={`appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all`}
                        placeholder={t('auth_address_placeholder') || "123 Main Street, City, State, ZIP"}
                      />
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <label htmlFor="center_type" className="block text-sm font-medium text-gray-200">
                      Center Type
                    </label>
                    <div className="mt-1">
                      <motion.select
                        whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                        transition={{ duration: 0.2 }}
                        id="center_type"
                        name="center_type"
                        value={formData.center_type}
                        onChange={handleChange}
                        className="appearance-none block w-full px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all"
                      >
                        <option value="generic">Generic Medical Center</option>
                        <option value="personal">Personal Practice</option>
                      </motion.select>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div className="flex items-center">
                      <motion.input
                        whileFocus={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                        id="offers_labs"
                        name="offers_labs"
                        type="checkbox"
                        checked={formData.offers_labs}
                        onChange={(e) => setFormData(prev => ({ ...prev, offers_labs: e.target.checked }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="offers_labs" className="ml-2 block text-sm text-gray-200">
                        Offers Lab Tests
                      </label>
                    </div>
                    <div className="flex items-center">
                      <motion.input
                        whileFocus={{ scale: 1.1 }}
                        transition={{ duration: 0.2 }}
                        id="offers_imaging"
                        name="offers_imaging"
                        type="checkbox"
                        checked={formData.offers_imaging}
                        onChange={(e) => setFormData(prev => ({ ...prev, offers_imaging: e.target.checked }))}
                        className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                      />
                      <label htmlFor="offers_imaging" className="ml-2 block text-sm text-gray-200">
                        Offers Imaging
                      </label>
                    </div>
                  </motion.div>
                </motion.div>
              </AnimatePresence>
            )}

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <label htmlFor="password" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_password_label') || 'Password'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => {
                    handleChange(e)
                    clearValidationError('password')
                  }}
                  className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all ${
                    validationErrors.password ? 'border-red-400 focus:ring-red-400' : 'border-white/30'
                  }`}
                  placeholder={t('auth_password_placeholder') || 'Enter strong password'}
                />
                {validationErrors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-400"
                  >
                    {validationErrors.password}
                  </motion.p>
                )}
                {formData.password && !validationErrors.password && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-gray-400"
                  >
                    {validatePassword(formData.password) 
                      ? "✓ Strong password" 
                      : "Password must be 8+ chars with uppercase, lowercase, and number"
                    }
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              <label htmlFor="confirmPassword" className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {t('auth_password_confirm_label') || 'Confirm Password'}
              </label>
              <div className="mt-1">
                <motion.input
                  whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(147, 51, 234, 0.3)" }}
                  transition={{ duration: 0.2 }}
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    handleChange(e)
                    clearValidationError('confirmPassword')
                  }}
                  className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-purple-400 sm:text-sm transition-all ${
                    validationErrors.confirmPassword ? 'border-red-400 focus:ring-red-400' : 'border-white/30'
                  }`}
                  placeholder={t('auth_password_confirm_placeholder') || 'Confirm your password'}
                />
                {validationErrors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-red-400"
                  >
                    {validationErrors.confirmPassword}
                  </motion.p>
                )}
                {formData.confirmPassword && formData.password && formData.password === formData.confirmPassword && !validationErrors.confirmPassword && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-1 text-sm text-[#4DBCC4]"
                  >
                    ✓ Passwords match
                  </motion.p>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.6 }}
            >
              <motion.button
                type="submit"
                disabled={isLoading}
                whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(147, 51, 234, 0.3)" }}
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
                  t('auth_create_submit') || 'Create Account'
                )}
              </motion.button>
            </motion.div>
          </motion.form>
        </div>
      </motion.div>

      {/* Medical Records Form for Patients */}
      <AnimatePresence>
        {showMedicalForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{t('auth_medical_records_title') || 'Complete Your Medical Records'}</h2>
                <p className="text-gray-300">
                  {t('auth_medical_records_desc') || 'Please provide your medical information to help doctors provide better care. You can skip this step and add information later if needed.'}
                </p>
              </div>

              <MedicalRecordsForm
                isOpen={true}
                onClose={() => setShowMedicalForm(false)}
                onComplete={handleMedicalRecordsComplete}
                patientId={registeredPatient?.id || ''}
                patientName={registeredPatient?.name || ''}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doctor Certificate Upload Form */}
      <AnimatePresence>
        {showDoctorCertificateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl shadow-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">Upload Medical Certificates</h2>
                <p className="text-gray-300">
                  Please upload your medical certificates and licenses for verification. Your account will be pending approval until these documents are reviewed by our admin team.
                </p>
              </div>

              <DoctorCertificateUpload
                onUploadComplete={handleCertificateUploadComplete}
                onSkip={handleCertificateUploadSkip}
                doctorToken={registeredDoctor?.token || ''}
                showSkipOption={true}
                isModal={true}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
