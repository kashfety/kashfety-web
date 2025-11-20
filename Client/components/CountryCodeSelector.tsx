"use client"

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import { useLocale } from '@/components/providers/locale-provider'

interface Country {
  code: string
  name: string
  nameAr: string
  flag: string
  phoneCode: string
}

const countries: Country[] = [
  { code: 'US', name: 'United States', nameAr: 'الولايات المتحدة', flag: '🇺🇸', phoneCode: '+1' },
  { code: 'GB', name: 'United Kingdom', nameAr: 'المملكة المتحدة', flag: '🇬🇧', phoneCode: '+44' },
  { code: 'CA', name: 'Canada', nameAr: 'كندا', flag: '🇨🇦', phoneCode: '+1' },
  { code: 'AU', name: 'Australia', nameAr: 'أستراليا', flag: '🇦🇺', phoneCode: '+61' },
  { code: 'DE', name: 'Germany', nameAr: 'ألمانيا', flag: '🇩🇪', phoneCode: '+49' },
  { code: 'FR', name: 'France', nameAr: 'فرنسا', flag: '🇫🇷', phoneCode: '+33' },
  { code: 'IT', name: 'Italy', nameAr: 'إيطاليا', flag: '🇮🇹', phoneCode: '+39' },
  { code: 'ES', name: 'Spain', nameAr: 'إسبانيا', flag: '🇪🇸', phoneCode: '+34' },
  { code: 'NL', name: 'Netherlands', nameAr: 'هولندا', flag: '🇳🇱', phoneCode: '+31' },
  { code: 'SE', name: 'Sweden', nameAr: 'السويد', flag: '🇸🇪', phoneCode: '+46' },
  { code: 'NO', name: 'Norway', nameAr: 'النرويج', flag: '🇳🇴', phoneCode: '+47' },
  { code: 'DK', name: 'Denmark', nameAr: 'الدنمارك', flag: '🇩🇰', phoneCode: '+45' },
  { code: 'FI', name: 'Finland', nameAr: 'فنلندا', flag: '🇫🇮', phoneCode: '+358' },
  { code: 'PL', name: 'Poland', nameAr: 'بولندا', flag: '🇵🇱', phoneCode: '+48' },
  { code: 'CZ', name: 'Czech Republic', nameAr: 'التشيك', flag: '🇨🇿', phoneCode: '+420' },
  { code: 'AT', name: 'Austria', nameAr: 'النمسا', flag: '🇦🇹', phoneCode: '+43' },
  { code: 'CH', name: 'Switzerland', nameAr: 'سويسرا', flag: '🇨🇭', phoneCode: '+41' },
  { code: 'BE', name: 'Belgium', nameAr: 'بلجيكا', flag: '🇧🇪', phoneCode: '+32' },
  { code: 'PT', name: 'Portugal', nameAr: 'البرتغال', flag: '🇵🇹', phoneCode: '+351' },
  { code: 'GR', name: 'Greece', nameAr: 'اليونان', flag: '🇬🇷', phoneCode: '+30' },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷', phoneCode: '+90' },
  { code: 'RU', name: 'Russia', nameAr: 'روسيا', flag: '🇷🇺', phoneCode: '+7' },
  { code: 'CN', name: 'China', nameAr: 'الصين', flag: '🇨🇳', phoneCode: '+86' },
  { code: 'JP', name: 'Japan', nameAr: 'اليابان', flag: '🇯🇵', phoneCode: '+81' },
  { code: 'KR', name: 'South Korea', nameAr: 'كوريا الجنوبية', flag: '🇰🇷', phoneCode: '+82' },
  { code: 'IN', name: 'India', nameAr: 'الهند', flag: '🇮🇳', phoneCode: '+91' },
  { code: 'BR', name: 'Brazil', nameAr: 'البرازيل', flag: '🇧🇷', phoneCode: '+55' },
  { code: 'MX', name: 'Mexico', nameAr: 'المكسيك', flag: '🇲🇽', phoneCode: '+52' },
  { code: 'AR', name: 'Argentina', nameAr: 'الأرجنتين', flag: '🇦🇷', phoneCode: '+54' },
  { code: 'CL', name: 'Chile', nameAr: 'تشيلي', flag: '🇨🇱', phoneCode: '+56' },
  { code: 'CO', name: 'Colombia', nameAr: 'كولومبيا', flag: '🇨🇴', phoneCode: '+57' },
  { code: 'PE', name: 'Peru', nameAr: 'بيرو', flag: '🇵🇪', phoneCode: '+51' },
  { code: 'ZA', name: 'South Africa', nameAr: 'جنوب أفريقيا', flag: '🇿🇦', phoneCode: '+27' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', phoneCode: '+20' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦', phoneCode: '+212' },
  { code: 'NG', name: 'Nigeria', nameAr: 'نيجيريا', flag: '🇳🇬', phoneCode: '+234' },
  { code: 'KE', name: 'Kenya', nameAr: 'كينيا', flag: '🇰🇪', phoneCode: '+254' },
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', phoneCode: '+966' },
  { code: 'AE', name: 'United Arab Emirates', nameAr: 'الإمارات', flag: '🇦🇪', phoneCode: '+971' },
  { code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', phoneCode: '+974' },
  { code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', phoneCode: '+965' },
  { code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', phoneCode: '+973' },
  { code: 'OM', name: 'Oman', nameAr: 'عمان', flag: '🇴🇲', phoneCode: '+968' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', phoneCode: '+962' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧', phoneCode: '+961' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾', phoneCode: '+963' },
  { code: 'IQ', name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶', phoneCode: '+964' },
  { code: 'IL', name: 'Israel', nameAr: 'إسرائيل', flag: '🇮🇱', phoneCode: '+972' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸', phoneCode: '+970' },
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
  const { t, locale } = useLocale()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const filteredCountries = countries.filter(country => {
    const countryName = locale === 'ar' ? country.nameAr : country.name
    return countryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      country.phoneCode.includes(searchTerm)
  })

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
      <label className={`block text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
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
            className={`flex items-center space-x-2 px-3 py-2 border border-white/30 rounded-lg shadow-sm bg-white/10 backdrop-blur-sm ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all`}
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
                className={`absolute z-50 mt-1 w-72 backdrop-blur-lg border rounded-lg shadow-2xl max-h-60 overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gray-800/95 border-white/20' 
                    : 'bg-white border-gray-200'
                }`}
              >
                {/* Search input */}
                <div className={`p-3 border-b ${theme === 'dark' ? 'border-white/10' : 'border-gray-200'}`}>
                  <input
                    type="text"
                    placeholder={t('country_selector_search') || "Search countries..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`w-full px-3 py-2 bg-white/10 border border-white/20 rounded ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} ${theme === 'dark' ? 'placeholder-gray-400' : 'placeholder-gray-500'} focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm`}
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
                      whileHover={{ backgroundColor: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' }}
                      className={`w-full flex items-center space-x-3 px-4 py-2 text-left transition-colors ${
                        theme === 'dark' ? 'hover:bg-white/10' : 'hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg">{country.flag}</span>
                      <span className={`font-mono text-sm min-w-[3rem] ${theme === 'dark' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        {country.phoneCode}
                      </span>
                      <span className={`text-sm truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                        {locale === 'ar' ? country.nameAr : country.name}
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
          {error || t('country_selector_invalid')?.replace('{country}', locale === 'ar' ? selectedCountry.nameAr : selectedCountry.name) || `Please enter a valid phone number for ${selectedCountry.name}`}
        </motion.p>
      )}

      {/* Phone format hint */}
      {phoneNumber && isPhoneValid && (
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-400"
        >
          ✓ {t('country_selector_valid')?.replace('{country}', locale === 'ar' ? selectedCountry.nameAr : selectedCountry.name) || `Valid ${selectedCountry.name} phone number`}
        </motion.p>
      )}
    </div>
  )
}

// Export the countries array and types for reuse
export { countries, type Country }