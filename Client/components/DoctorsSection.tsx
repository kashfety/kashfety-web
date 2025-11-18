"use client"

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { Star, Award, Clock, Heart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLocale } from "@/components/providers/locale-provider";
import { localizeDoctorName, localizeSpecialty, toArabicNumerals, formatCurrency } from "@/lib/i18n";

interface Doctor {
  id: string;
  name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  name_ar?: string;
  specialty: string;
  experience_years: number;
  profile_picture_url: string;
  available_for_home_visits: boolean;
  consultation_fee: number;
  rating: number;
  location: string;
}

const DoctorsSection = () => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleDoctors, setVisibleDoctors] = useState<Set<number>>(new Set());
  const [specialtiesMap, setSpecialtiesMap] = useState<Map<string, { name_ar?: string; name_ku?: string }>>(new Map());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const { t, locale } = useLocale();

  // Helper to get localized name
  const getLocalizedName = (item: { name?: string; name_ar?: string; first_name_ar?: string; last_name_ar?: string } | null) => {
    if (!item) return '';
    if (locale === 'ar') {
      if (item.name_ar) return item.name_ar;
      if (item.first_name_ar && item.last_name_ar) return `${item.first_name_ar} ${item.last_name_ar}`;
    }
    return item.name || '';
  };

  // Helper to get localized specialty name
  const getLocalizedSpecialty = (specialtyName: string) => {
    const specialtyData = specialtiesMap.get(specialtyName);
    if (!specialtyData) return specialtyName;
    
    if (locale === 'ar' && specialtyData.name_ar) return specialtyData.name_ar;
    if (locale === 'ku' && specialtyData.name_ku) return specialtyData.name_ku;
    return specialtyName;
  };

  // Reset visible doctors when component mounts
  useEffect(() => {
    setVisibleDoctors(new Set());
  }, []);

  useEffect(() => {
    fetchSpecialties();
    fetchDoctors();
    
    // Setup intersection observer for scroll animations
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting) {
            // Add to visible when entering viewport
            setVisibleDoctors(prev => new Set([...prev, index]));
          } else {
            // Remove from visible when leaving viewport (for re-animation)
            setVisibleDoctors(prev => {
              const newSet = new Set(prev);
              newSet.delete(index);
              return newSet;
            });
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '100px 0px -100px 0px'
      }
    );

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    // Observe doctor cards when they're rendered
    if (doctors.length > 0 && observerRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        const cards = document.querySelectorAll('.doctor-card');
        cards.forEach(card => {
          if (observerRef.current) {
            observerRef.current.observe(card);
          }
        });
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [doctors]);

  const fetchSpecialties = async () => {
    try {
      const response = await fetch('/api/specialties');
      const result = await response.json();
      
      if (result.success && result.specialties) {
        const map = new Map();
        result.specialties.forEach((specialty: any) => {
          map.set(specialty.name, {
            name_ar: specialty.name_ar,
            name_ku: specialty.name_ku
          });
        });
        setSpecialtiesMap(map);
      }
    } catch (error) {
      console.error('Error fetching specialties:', error);
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await fetch('/api/doctors');
      const result = await response.json();
      
      if (result.success) {
        setDoctors(result.doctors.slice(0, 6)); // Show only first 6 doctors
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">{t('doctors_section_title_loading') || 'Our Expert Doctors'}</h2>
            <p className="text-lg text-muted-foreground">{t('doctors_section_desc_loading') || 'Meet our team of experienced healthcare professionals'}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="bg-muted rounded-2xl h-64 mb-4"></div>
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-br from-blue-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-800 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-10"></div>
      <div className="absolute top-10 left-5 sm:top-20 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float"></div>
      <div className="absolute bottom-10 right-5 sm:bottom-20 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-float-slow"></div>
      
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-800 px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4 sm:mb-6 animate-fade-in dark:bg-emerald-900/20 dark:text-emerald-300">
            <Heart className="w-3 h-3 sm:w-4 sm:h-4" />
            {t('doctors_section_tagline') || 'Trusted Healthcare Professionals'}
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 animate-slide-in-up">
            {t('doctors_section_title_prefix') || 'Meet Our Expert'}
            <span className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] bg-clip-text text-transparent"> {t('doctors_section_title_suffix') || 'Doctors'}</span>
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed animate-slide-in-up px-4" style={{animationDelay: '0.2s'}}>
            {t('doctors_section_description') || "Discover exceptional healthcare with Kashfety's network of certified doctors. Experience personalized care from the comfort of your home or visit our modern clinics."}
          </p>
        </div>

        {/* Doctors Showcase */}
        <div className="space-y-12 sm:space-y-16">
          {doctors.map((doctor, index) => (
            <DoctorShowcaseCard 
              key={doctor.id} 
              doctor={doctor} 
              index={index}
              isVisible={visibleDoctors.has(index)}
              locale={locale}
              specialtiesMap={specialtiesMap}
            />
          ))}
        </div>

        {/* Kashfety App Promotion */}
        <div className="mt-16 sm:mt-20 lg:mt-24 text-center">
          <div className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] rounded-3xl p-6 sm:p-8 lg:p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="relative z-10">
              <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
                {t('doctors_section_promo_title') || 'Experience Healthcare with Kashfety'}
              </h3>
              <p className="text-lg sm:text-xl mb-6 sm:mb-8 opacity-90 max-w-2xl mx-auto">
                {t('doctors_section_promo_desc') || 'Join thousands of satisfied patients who trust Kashfety for their healthcare needs. Quality care, experienced doctors, all in one app.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 sm:px-6 py-3 text-sm sm:text-lg font-medium">
                  ⭐ {t('doctors_section_promo_rating') || '4.9/5 Patient Rating'}
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 sm:px-6 py-3 text-sm sm:text-lg font-medium">
                  🏥 {t('doctors_section_promo_doctors') || '50+ Expert Doctors'}
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 sm:px-6 py-3 text-sm sm:text-lg font-medium">
                  📱 {t('doctors_section_promo_available') || 'Available 24/7'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Doctor Showcase Card for advertising display
const DoctorShowcaseCard = ({ 
  doctor, 
  index, 
  isVisible,
  locale,
  specialtiesMap,
}: { 
  doctor: Doctor; 
  index: number; 
  isVisible: boolean;
  locale: any;
  specialtiesMap: Map<string, { name_ar?: string; name_ku?: string }>;
}) => {
  const isEven = index % 2 === 0;
  const { t } = useLocale();
  
  // Get localized doctor name from database
  const getLocalizedName = (item: { name?: string; name_ar?: string; first_name_ar?: string; last_name_ar?: string } | null) => {
    if (!item) return '';
    if (locale === 'ar') {
      if (item.name_ar) return item.name_ar;
      if (item.first_name_ar && item.last_name_ar) return `${item.first_name_ar} ${item.last_name_ar}`;
    }
    return item.name || '';
  };

  // Get localized specialty name from database
  const getLocalizedSpecialty = (specialtyName: string) => {
    const specialtyData = specialtiesMap.get(specialtyName);
    if (!specialtyData) return specialtyName;
    
    if (locale === 'ar' && specialtyData.name_ar) return specialtyData.name_ar;
    if (locale === 'ku' && specialtyData.name_ku) return specialtyData.name_ku;
    return specialtyName;
  };
  
  const localizedName = getLocalizedName(doctor);
  const localizedSpecialty = getLocalizedSpecialty(doctor.specialty)

  return (
    <div 
      className={`doctor-card flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} 
                  gap-6 sm:gap-8 lg:gap-16 items-center transition-all duration-1000 ease-out
                  ${isVisible 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                  }`}
      data-index={index}
      style={{
        transitionDelay: isVisible ? `${(index % 3) * 0.2}s` : '0s'
      }}
    >
      {/* Doctor Image */}
      <div className="flex-1 relative">
        <div className="relative w-full max-w-sm sm:max-w-md mx-auto">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-3xl transform rotate-6 opacity-20"></div>
          <div className="relative bg-background rounded-3xl p-4 sm:p-6 lg:p-8 shadow-2xl transform hover:scale-105 transition-transform duration-500 border border-border">
            <div className="relative w-full h-64 sm:h-72 lg:h-80 rounded-2xl overflow-hidden mb-4 sm:mb-6">
              <Image
                src={doctor.profile_picture_url || "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&h=400&fit=crop&crop=face"}
                alt={doctor.name}
                fill
                className="object-cover"
              />
              <div className="absolute top-3 sm:top-4 right-3 sm:right-4 bg-[#4DBCC4] text-white px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
                ⭐ {toArabicNumerals(doctor.rating || '4.8', locale)}
              </div>
            </div>
            
            {/* Achievement Badges */}
            <div className="flex flex-wrap gap-2 justify-center">
              <div className="bg-blue-100 text-blue-800 px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 dark:bg-blue-900/30 dark:text-blue-300">
                <Award className="w-3 h-3" />
                {t('doctors_section_certified') || 'Certified'}
              </div>
              <div className="bg-emerald-100 text-emerald-800 px-2 sm:px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 dark:bg-emerald-900/30 dark:text-emerald-300">
                <Clock className="w-3 h-3" />
                {toArabicNumerals(doctor.experience_years, locale)}+ {t('doctors_section_years') || 'years'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Doctor Information */}
      <div className="flex-1 text-center lg:text-left px-4 sm:px-0">
        <div className="mb-4">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
            {localizedName}
          </h3>
          <p className="text-lg sm:text-xl text-[#4DBCC4] font-semibold mb-4">
            {localizedSpecialty}
          </p>
          <div className="flex items-center gap-2 justify-center lg:justify-start text-muted-foreground mb-4 sm:mb-6">
            <Star className="w-4 sm:w-5 sm:h-5 text-yellow-400 fill-current" />
            <span className="text-base sm:text-lg font-medium">{toArabicNumerals(doctor.rating || '4.8', locale)}</span>
            <span className="text-gray-400">•</span>
            <span className="text-sm sm:text-base">{toArabicNumerals('85', locale)}+ {t('doctors_section_happy_patients') || 'Happy Patients'}</span>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
          <div className="flex items-start gap-2 sm:gap-3 justify-center lg:justify-start">
            <Award className="w-5 sm:w-6 sm:h-6 text-[#4DBCC4] mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">{t('doctors_section_expert_in') || 'Expert in'} {localizedSpecialty}</p>
              <p className="text-muted-foreground text-xs sm:text-sm">{t('doctors_section_years_line') || 'With'} {toArabicNumerals(doctor.experience_years, locale)}+ {t('doctors_section_years') || 'years'} {t('doctors_section_dedicated_practice') || 'of dedicated practice'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 sm:gap-3 justify-center lg:justify-start">
            <Heart className="w-5 sm:w-6 sm:h-6 text-red-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">{t('doctors_section_compassionate_care') || 'Compassionate Care'}</p>
              <p className="text-muted-foreground text-xs sm:text-sm">{t('doctors_section_personalized') || 'Personalized treatment plans for every patient'}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 sm:gap-3 justify-center lg:justify-start">
            <Clock className="w-5 sm:w-6 sm:h-6 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground text-sm sm:text-base">{t('doctors_section_flexible_appointments') || 'Flexible Appointments'}</p>
              <p className="text-muted-foreground text-xs sm:text-sm">{t('doctors_section_available_both') || 'Available for both clinic visits and home consultations'}</p>
            </div>
          </div>
        </div>

        {/* Kashfety App Call-to-Action */}
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-2xl p-4 sm:p-6 border border-emerald-200 dark:from-gray-900 dark:to-gray-900 dark:border-emerald-900/30">
          <p className="text-base sm:text-lg font-semibold text-foreground mb-2">
            {t('doctors_section_book_with',).replace('{name}', localizedName) || `Book with ${localizedName} on Kashfety`}
          </p>
          <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base">
            {t('doctors_section_download_app') || 'Download the Kashfety app for instant consultations and seamless healthcare management'}
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center lg:justify-start">
            <div className="bg-background px-3 sm:px-4 py-2 rounded-xl shadow-sm text-xs sm:text-sm font-medium text-foreground border border-border">
              📱 {t('doctors_section_easy_booking') || 'Easy Booking'}
            </div>
            <div className="bg-background px-3 sm:px-4 py-2 rounded-xl shadow-sm text-xs sm:text-sm font-medium text-foreground border border-border">
              🏠 {t('doctors_section_home_visits') || 'Home Visits'}
            </div>
            <div className="bg-background px-3 sm:px-4 py-2 rounded-xl shadow-sm text-xs sm:text-sm font-medium text-foreground border border-border">
              💊 {t('doctors_section_e_prescriptions') || 'E-Prescriptions'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorsSection;
