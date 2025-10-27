"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'

interface Country {
  code: string
  name: string
  flag: string
  phoneCode: string
}

const countries: Country[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', phoneCode: '+44' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', phoneCode: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', phoneCode: '+61' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', phoneCode: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', phoneCode: '+33' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', phoneCode: '+39' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', phoneCode: '+34' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', phoneCode: '+31' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪', phoneCode: '+46' },
  { code: 'NO', name: 'Norway', flag: '🇳🇴', phoneCode: '+47' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰', phoneCode: '+45' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮', phoneCode: '+358' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱', phoneCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', flag: '🇨🇿', phoneCode: '+420' },
  { code: 'AT', name: 'Austria', flag: '🇦🇹', phoneCode: '+43' },
  { code: 'CH', name: 'Switzerland', flag: '🇨🇭', phoneCode: '+41' },
  { code: 'BE', name: 'Belgium', flag: '🇧🇪', phoneCode: '+32' },
  { code: 'PT', name: 'Portugal', flag: '🇵🇹', phoneCode: '+351' },
  { code: 'GR', name: 'Greece', flag: '🇬🇷', phoneCode: '+30' },
  { code: 'TR', name: 'Turkey', flag: '🇹🇷', phoneCode: '+90' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', phoneCode: '+7' },
  { code: 'CN', name: 'China', flag: '🇨🇳', phoneCode: '+86' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', phoneCode: '+81' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', phoneCode: '+82' },
  { code: 'IN', name: 'India', flag: '🇮🇳', phoneCode: '+91' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', phoneCode: '+55' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', phoneCode: '+52' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', phoneCode: '+54' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱', phoneCode: '+56' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴', phoneCode: '+57' },
  { code: 'PE', name: 'Peru', flag: '🇵🇪', phoneCode: '+51' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', phoneCode: '+27' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', phoneCode: '+20' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦', phoneCode: '+212' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', phoneCode: '+234' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', phoneCode: '+254' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', phoneCode: '+966' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', phoneCode: '+971' },
  { code: 'QA', name: 'Qatar', flag: '🇶🇦', phoneCode: '+974' },
  { code: 'KW', name: 'Kuwait', flag: '🇰🇼', phoneCode: '+965' },
  { code: 'BH', name: 'Bahrain', flag: '🇧🇭', phoneCode: '+973' },
  { code: 'OM', name: 'Oman', flag: '🇴🇲', phoneCode: '+968' },
  { code: 'JO', name: 'Jordan', flag: '🇯🇴', phoneCode: '+962' },
  { code: 'LB', name: 'Lebanon', flag: '🇱🇧', phoneCode: '+961' },
  { code: 'SY', name: 'Syria', flag: '🇸🇾', phoneCode: '+963' },
  { code: 'IQ', name: 'Iraq', flag: '🇮🇶', phoneCode: '+964' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱', phoneCode: '+972' },
  { code: 'PS', name: 'Palestine', flag: '🇵🇸', phoneCode: '+970' },
]

interface CountryCodeSelectorProps {
  selectedCountry: Country
  onCountryChange: (country: Country) => void
  phoneNumber: string
  onPhoneNumberChange: (phoneNumber: string) => void
  error?: string
  placeholder?: string
  label?: string
}

export default function CountryCodeSelector({
  selectedCountry,
  onCountryChange,
  phoneNumber,
  onPhoneNumberChange,
  error,
  placeholder = "Phone number",
  label = "Phone Number"
}: CountryCodeSelectorProps) {
  const { theme } = useTheme()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.phoneCode.includes(searchTerm)
  )

  const validatePhoneNumber = (phone: string, countryCode: string) => {
    // Remove any non-digit characters except + and spaces
    const cleanPhone = phone.replace(/[^\d\s]/g, '')
    
    // Basic validation based on country
    switch (countryCode) {
      case '+1': // US/Canada
        return /^\d{10}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+44': // UK
        return /^\d{10,11}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+49': // Germany
        return /^\d{10,12}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+33': // France
        return /^\d{9,10}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+39': // Italy
        return /^\d{9,10}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+91': // India
        return /^\d{10}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+86': // China
        return /^\d{11}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+81': // Japan
        return /^\d{10,11}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+82': // South Korea
        return /^\d{9,10}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+966': // Saudi Arabia
        return /^\d{9}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+971': // UAE
        return /^\d{9}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+20': // Egypt
        return /^\d{9,10}$/.test(cleanPhone.replace(/\s/g, ''))
      case '+964': // Iraq (Kurdistan)
        return /^\d{10}$/.test(cleanPhone.replace(/\s/g, ''))
      default:
        return /^\d{7,15}$/.test(cleanPhone.replace(/\s/g, ''))
    }
  }

  const isPhoneValid = phoneNumber ? validatePhoneNumber(phoneNumber, selectedCountry.phoneCode) : true

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-200">
        {label}
      </label>
      <div className="flex space-x-2">
        {/* Country Code Selector */}
        <div className="relative">
          <motion.button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-2 px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm">{selectedCountry.phoneCode}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="absolute z-50 mt-1 w-72 bg-gray-800/95 backdrop-blur-lg border border-white/20 rounded-lg shadow-2xl max-h-60 overflow-hidden"
              >
                {/* Search input */}
                <div className="p-3 border-b border-white/10">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-3 py-2 bg-white/10 border border-white/20 rounded ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm`}
                  />
                </div>

                {/* Countries list */}
                <div className="max-h-48 overflow-y-auto">
                  {filteredCountries.map((country) => (
                    <motion.button
                      key={country.code}
                      type="button"
                      onClick={() => {
                        onCountryChange(country)
                        setIsDropdownOpen(false)
                        setSearchTerm('')
                      }}
                      whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                      className="w-full flex items-center space-x-3 px-4 py-2 text-left hover:bg-white/10 transition-colors"
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className="text-emerald-400 font-mono text-sm min-w-[3rem]">
                        {country.phoneCode}
                      </span>
                      <span className="text-gray-200 text-sm truncate">
                        {country.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Phone Number Input */}
        <div className="flex-1">
          <motion.input
            type="tel"
            value={phoneNumber}
            onChange={(e) => onPhoneNumberChange(e.target.value)}
            placeholder={placeholder}
            whileFocus={{ scale: 1.02, boxShadow: "0 0 20px rgba(16, 185, 129, 0.3)" }}
            className={`appearance-none block w-full px-3 py-2 border rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-800'} focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 sm:text-sm transition-all ${
              error || (!isPhoneValid && phoneNumber) 
                ? 'border-red-400 focus:ring-red-400' 
                : 'border-white/30'
            }`}
          />
        </div>
      </div>

      {/* Error Messages */}
      {(error || (!isPhoneValid && phoneNumber)) && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-red-400"
        >
          {error || `Please enter a valid phone number for ${selectedCountry.name}`}
        </motion.p>
      )}

      {/* Phone format hint */}
      {phoneNumber && isPhoneValid && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-400"
        >
          ✓ Valid {selectedCountry.name} phone number
        </motion.p>
      )}
    </div>
  )
}

// Export the countries array and types for reuse
export { countries, type Country }