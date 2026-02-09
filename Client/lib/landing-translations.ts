import type { Locale } from '@/lib/i18n'

/**
 * English translations for Kashfety landing page
 */
const enTranslations = {
  hero: {
    tagline: 'Your trusted healthcare partner',
    slogan: 'Healthcare Simplified',
    headline: 'Kashfety',
    cta: 'Book Appointment',
  },

  header: {
    brandName: 'Kashfety',
    signIn: 'Sign In',
    dashboard: 'Dashboard',
    logout: 'Logout',
    loading: '...',
    languageAr: 'العربية',
    languageEn: 'EN',
    languageShortAr: 'AR',
    languageShortEn: 'EN',
  },

  howItWorks: {
    title: 'How it works',
    steps: [
      {
        number: '1',
        title: 'Choose',
        description: 'Pick a doctor or medical center that fits your needs',
      },
      {
        number: '2',
        title: 'Select Time',
        description: 'Book a clinic visit or home visit at your convenience',
      },
      {
        number: '3',
        title: 'Get Care',
        description: 'Receive quality care and keep records in one place',
      },
    ],
  },

  services: {
    title: 'Our Services',
    description: 'Everything you need for quality healthcare in one platform',
    services: [
      {
        title: 'Doctor Appointments',
        description: 'Book visits with certified doctors at clinics near you or at home',
      },
      {
        title: 'Lab Tests',
        description: 'Order tests at certified diagnostic centers and get results online',
      },
      {
        title: 'Home Visits',
        description: 'Get care in the comfort of your home when available',
      },
    ],
  },

  about: {
    title: 'About Kashfety',
    mission: 'Quality healthcare accessible to everyone',
    description:
      'We believe healthcare should be simple, transparent, and accessible. Kashfety connects you with a verified network of doctors and diagnostic centers, putting your health in control.',
    values: [
      'Verified & Certified Doctors',
      'Transparent Pricing',
      'Trusted Reviews & Ratings',
      '500+ Medical Centers',
      '10k+ Happy Patients',
      'Care Records in One Place',
    ],
    stats: {
      medicalCenters: 'Medical Centers',
      happyPatients: 'Happy Patients',
      rating: 'Rating',
    },
    appDownload: 'Get the App',
    appComingSoon: 'iOS & Android Coming Soon',
  },

  footer: {
    brandName: 'Kashfety',
    tagline: 'Your path to better health',
    company: 'Company',
    about: 'About',
    contact: 'Contact',
    legal: 'Legal',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    copyright: '© 2024 Kashfety. All rights reserved.',
  },
} as const

/**
 * Arabic translations for Kashfety landing page
 */
const arTranslations = {
  hero: {
    tagline: 'شريكك الموثوق في الرعاية الصحية',
    slogan: 'الرعاية الصحية بكل بساطة',
    headline: 'كاشفتي',
    cta: 'احجز موعداً',
  },

  header: {
    brandName: 'كاشفتي',
    signIn: 'دخول',
    dashboard: 'لوحة التحكم',
    logout: 'خروج',
    loading: '...',
    languageAr: 'العربية',
    languageEn: 'EN',
    languageShortAr: 'AR',
    languageShortEn: 'EN',
  },

  howItWorks: {
    title: 'كيفية العمل',
    steps: [
      {
        number: '1',
        title: 'اختر',
        description: 'اختر طبيباً أو مركزاً طبياً يناسب احتياجاتك',
      },
      {
        number: '2',
        title: 'حدد الوقت',
        description: 'احجز زيارة عيادة أو زيارة منزلية حسب رغبتك',
      },
      {
        number: '3',
        title: 'احصل على الرعاية',
        description: 'استقبل رعاية جودة واحفظ السجلات في مكان واحد',
      },
    ],
  },

  services: {
    title: 'خدماتنا',
    description: 'كل ما تحتاجه للرعاية الصحية الجودة في منصة واحدة',
    services: [
      {
        title: 'مواعيد الأطباء',
        description: 'احجز زيارات مع أطباء معتمدين في العيادات القريبة منك أو في المنزل',
      },
      {
        title: 'اختبارات المختبر',
        description: 'اطلب اختبارات في مراكز تشخيصية معتمدة واحصل على النتائج عبر الإنترنت',
      },
      {
        title: 'الزيارات المنزلية',
        description: 'احصل على الرعاية في مكان راحتك عندما تكون متاحة',
      },
    ],
  },

  about: {
    title: 'حول Kashfety',
    mission: 'الرعاية الصحية الجودة متاحة للجميع',
    description:
      'نحن نؤمن بأن الرعاية الصحية يجب أن تكون بسيطة وشفافة وميسورة الوصول. تربطك Kashfety بشبكة معتمدة من الأطباء ومراكز التشخيص، مما يضع صحتك تحت السيطرة.',
    values: [
      'أطباء معتمدون ومدققون',
      'أسعار شفافة',
      'تقييمات وآراء موثوقة',
      '500+ مركز طبي',
      '10000+ مريض سعيد',
      'سجلات الرعاية في مكان واحد',
    ],
    stats: {
      medicalCenters: 'مركز طبي',
      happyPatients: 'مريض سعيد',
      rating: 'تقييم',
    },
    appDownload: 'تحميل التطبيق',
    appComingSoon: 'iOS و Android قريباً',
  },

  footer: {
    brandName: 'كاشفتي',
    tagline: 'طريقك إلى صحة أفضل',
    company: 'شركة',
    about: 'حول',
    contact: 'تواصل',
    legal: 'قانوني',
    privacy: 'سياسة الخصوصية',
    terms: 'شروط الخدمة',
    copyright: '© 2024 Kashfety. جميع الحقوق محفوظة.',
  },
} as const

export type LandingTranslation = typeof enTranslations

/**
 * Get landing page translations for the given locale.
 * Used by landing components with useLocale() + getLandingTranslation(locale).
 */
export function getLandingTranslation(locale: Locale): LandingTranslation {
  return locale === 'ar' ? arTranslations : enTranslations
}
