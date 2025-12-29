"use client"

import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import Hero from "@/components/Hero";
import BookingForm from "@/components/BookingForm";
import Link from "next/link";
import DoctorsSection from "@/components/DoctorsSection";
import BookingModal from "@/components/BookingModal";
import ScrollToTop from "@/components/ScrollToTop";
import CursorTrail from "@/components/CursorTrail";
import { useLocale } from "@/components/providers/locale-provider";
import { useAuth } from "@/lib/providers/auth-provider";
import { toArabicNumerals } from "@/lib/i18n";

export default function HomePage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingModalMode, setBookingModalMode] = useState<'doctor' | 'lab'>('doctor');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const { t, isRTL, locale } = useLocale();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  // Helper functions for opening modal in different modes
  const openDoctorBooking = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setBookingModalMode('doctor');
    setIsBookingModalOpen(true);
  };

  const openLabBooking = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setBookingModalMode('lab');
    setIsBookingModalOpen(true);
  };

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Debug: Log RTL state

  // Create scroll-based transforms
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const backgroundOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0.5]);

  useEffect(() => {
    // Clear any old patient-dashboard localStorage entries
    if (typeof window !== 'undefined') {
      const defaultDashboard = localStorage.getItem('defaultDashboard');
      if (defaultDashboard === '/patient-dashboard') {
        localStorage.setItem('defaultDashboard', '/');
      }

      // Check if user came back from login for booking
      const bookingData = localStorage.getItem('bookingData');
      if (bookingData) {
        // Open booking modal automatically
        setIsBookingModalOpen(true);
      }
    }
  }, []);

  return (
    <div className={`min-h-screen bg-background relative overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content - No transform, sidebar overlays on top */}
      <div onClick={() => sidebarOpen && toggleSidebar()}>
        {/* Animated background elements */}
        <motion.div
          className="absolute inset-0 opacity-20 sm:opacity-30"
          style={{ y: backgroundY, opacity: backgroundOpacity }}
        >
          <div className="absolute top-5 left-5 sm:top-10 sm:left-10 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-[#4DBCC4] to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl"></div>
          <div className="absolute top-16 right-5 sm:top-32 sm:right-10 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-[#4DBCC4]/70 to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl"></div>
          <div className="absolute bottom-16 left-16 sm:bottom-32 sm:left-32 w-48 h-48 sm:w-72 sm:h-72 bg-gradient-to-br from-[#4DBCC4]/50 to-white dark:to-black rounded-full mix-blend-multiply filter blur-xl"></div>
        </motion.div>

        {/* Scroll Progress Bar */}
        <motion.div
          className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] z-50 origin-left"
          style={{ scaleX: scrollYProgress }}
        />

        {/* Header */}
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 pt-4 sm:pt-6 relative z-10"
        >
          <Header onMenuToggle={toggleSidebar} />
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 relative z-10"
        >
          <Hero onBookAppointment={openDoctorBooking} />
        </motion.div>

        {/* Booking Form */}
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-100px" }}
          id="services"
          className="w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 -mt-8 sm:-mt-16 relative z-10"
        >
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 items-start">
            <div className="xl:col-span-2">
              <BookingForm onBookAppointment={openDoctorBooking} />
            </div>
            <div className="bg-card border rounded-xl p-4 sm:p-6 mt-4 xl:mt-0">
              <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{t('labTestsTitle') || 'Laboratory Tests & Medical Imaging'}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t('bookLabTests') || 'Book lab tests and medical imaging at certified diagnostic centers'}</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={openLabBooking}
                  className="px-4 py-2 rounded-lg bg-[#4DBCC4] dark:bg-[#2a5f6b] text-white hover:opacity-90 transition-opacity text-center"
                >
                  {t('bookTest') || 'Book Test'}
                </button>
                <Link href="/labs" className="px-4 py-2 rounded-lg border-2 border-[#4DBCC4] dark:border-[#2a5f6b] text-[#4DBCC4] dark:text-[#2a5f6b] hover:bg-[#4DBCC4] dark:hover:bg-[#2a5f6b] hover:text-white transition-colors text-center">
                  {t('my_labs_title') || 'My Labs'}
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Doctors Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-50px" }}
          id="doctors"
          className="w-full mt-12 sm:mt-20 relative z-10"
        >
          <DoctorsSection />
        </motion.div>

        {/* Reviews Section */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          viewport={{ once: true, margin: "-50px" }}
          id="reviews"
          className="w-full mt-12 sm:mt-20 bg-background py-8 sm:py-16 relative z-10"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">{t('reviews_title') || 'What Our Patients Say'}</h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
                {t('reviews_subtitle') || 'Read testimonials from thousands of satisfied patients who trust Kashfety for their healthcare needs.'}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-8">{[
              {
                review: t('reviews_card_1') || "Excellent service! Dr. Ahmad was very professional and the home visit was convenient. Highly recommend HealthCare App for busy families.",
                name: "Sarah Hassan",
                role: t('reviews_role_1') || "Mother of 2",
                initials: "SH",
                bgColor: "bg-[#4DBCC4]/10",
                textColor: "text-[#4DBCC4]"
              },
              {
                review: t('reviews_card_2') || "Quick appointment booking and professional doctors. The online consultation feature saved me a lot of time. Great platform!",
                name: "Mohamed Khalil",
                role: t('reviews_role_2') || "Business Owner",
                initials: "MK",
                bgColor: "bg-green-100",
                textColor: "text-green-600"
              },
              {
                review: t('reviews_card_3') || "The emergency consultation was a lifesaver. Professional doctors available 24/7 and the response time was amazing.",
                name: "Fatima Ali",
                role: t('reviews_role_3') || "Teacher",
                initials: "FA",
                bgColor: "bg-purple-100",
                textColor: "text-purple-600"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.2,
                  ease: "easeOut"
                }}
                whileHover={{
                  scale: 1.05,
                  transition: { duration: 0.2 }
                }}
                viewport={{ once: true }}
                className="bg-card p-4 sm:p-6 rounded-xl shadow-lg cursor-pointer border border-border"
              >
                <div className="flex items-center mb-4">
                  <div className="flex text-yellow-400">
                    {"★★★★★".split("").map((star, i) => (
                      <motion.span
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.2 + i * 0.1 }}
                        viewport={{ once: true }}
                        className="text-lg sm:text-xl"
                      >
                        {star}
                      </motion.span>
                    ))}
                  </div>
                </div>
                <p className="text-foreground mb-4 text-sm sm:text-base">
                  "{testimonial.review}"
                </p>
                <div className="flex items-center">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 ${testimonial.bgColor} rounded-full flex items-center justify-center me-3`}>
                    <span className={`${testimonial.textColor} font-semibold text-sm sm:text-base`}>{testimonial.initials}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              viewport={{ once: true }}
              className="text-center mt-8 sm:mt-12"
            >
              <div className="inline-flex items-center bg-card rounded-full px-4 sm:px-6 py-3 shadow-lg border border-border">
                <div className="flex text-yellow-400 me-3">
                  {"★★★★★".split("").map((star, i) => (
                    <span key={i} className="text-base sm:text-lg">{star}</span>
                  ))}
                </div>
                <span className="text-foreground font-semibold text-sm sm:text-base">4.9/5</span>
                <span className="text-muted-foreground ms-2 text-xs sm:text-sm">{t('reviews_stat') || 'from 2,500+ reviews'}</span>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* About Us Section */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true, margin: "-50px" }}
          id="about"
          className="w-full mt-12 sm:mt-20 bg-background py-8 sm:py-16 relative z-10"
        >
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-8 sm:mb-12"
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4">{t('about_title') || 'About Kashfety'}</h2>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
                {t('about_desc') || 'Your trusted healthcare partner, connecting you with the best medical professionals for comprehensive care.'}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">{[
              {
                icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
                title: t('about_feature_1_title') || 'Compassionate Care',
                description: t('about_feature_1_desc') || 'We prioritize patient comfort and well-being, ensuring every interaction is filled with empathy and understanding.',
                bgColor: "bg-[#4DBCC4]/10",
                iconColor: "text-[#4DBCC4]"
              },
              {
                icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
                title: t('about_feature_2_title') || 'Expert Doctors',
                description: t('about_feature_2_desc') || 'Our network includes board-certified physicians and specialists with years of experience in their respective fields.',
                bgColor: "bg-blue-100",
                iconColor: "text-[#4DBCC4]"
              },
              {
                icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
                title: t('about_feature_3_title') || '24/7 Availability',
                description: t('about_feature_3_desc') || 'Round-the-clock medical support with emergency consultations available when you need them most.',
                bgColor: "bg-purple-100",
                iconColor: "text-purple-600"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.2,
                  ease: "easeOut"
                }}
                whileHover={{
                  y: -10,
                  transition: { duration: 0.3 }
                }}
                viewport={{ once: true }}
                className="text-center p-4 sm:p-6"
              >
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ duration: 0.3 }}
                  className={`w-12 h-12 sm:w-16 sm:h-16 ${feature.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}
                >
                  <svg className={`w-6 h-6 sm:w-8 sm:h-8 ${feature.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                  </svg>
                </motion.div>
                <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm sm:text-base">
                  {feature.description}
                </p>
              </motion.div>
            ))}
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              viewport={{ once: true }}
              className="bg-muted rounded-2xl p-4 sm:p-6 lg:p-8"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 items-center">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                  viewport={{ once: true }}
                >
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">{t('mission_title') || 'Our Mission'}</h3>
                  <p className="text-foreground mb-4 text-sm sm:text-base">
                    {t('mission_p1') || 'At Kashfety, we believe that quality healthcare should be accessible to everyone. Our platform bridges the gap between patients and healthcare providers, making it easier than ever to book appointments, consult with specialists, and receive the care you deserve.'}
                  </p>
                  <p className="text-foreground text-sm sm:text-base">
                    {t('mission_p2') || 'Whether you need a routine check-up, specialist consultation, or emergency care, our comprehensive network of medical professionals is here to serve you with excellence and dedication.'}
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.8 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-2 gap-3 sm:gap-4 text-center"
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  {[
                    { number: "500+", label: t('stat_verified_doctors') || 'Verified Doctors', color: "text-[#4DBCC4]" },
                    { number: "10k+", label: t('stat_happy_patients') || 'Happy Patients', color: "text-[#4DBCC4]" },
                    { number: "50+", label: t('stat_medical_centers') || 'Medical Centers', color: "text-[#4DBCC4]" },
                    { number: "24/7", label: t('stat_support_available') || 'Support Available', color: "text-[#4DBCC4]" }
                  ].map((stat, index) => {
                    // Convert number to Arabic numerals if locale is Arabic
                    let displayNumber = locale === 'ar' ? toArabicNumerals(stat.number, locale) : stat.number;
                    // Replace 'k' with Arabic equivalent 'ألف' (thousand) when locale is Arabic
                    if (locale === 'ar') {
                      displayNumber = displayNumber.replace(/k/gi, 'ألف');
                    }
                    return (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.5 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{
                          duration: 0.5,
                          delay: 0.8 + index * 0.1,
                          type: "spring",
                          stiffness: 200
                        }}
                        whileHover={{ scale: 1.05 }}
                        viewport={{ once: true }}
                        className="bg-card p-3 sm:p-4 rounded-lg border border-border"
                      >
                        <motion.div
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          transition={{ delay: 1 + index * 0.1 }}
                          viewport={{ once: true }}
                          className={`text-xl sm:text-2xl lg:text-3xl font-bold ${stat.color}`}
                          dir="ltr"
                        >
                          {displayNumber}
                        </motion.div>
                        <div className="text-muted-foreground text-xs sm:text-sm" dir={isRTL ? 'rtl' : 'ltr'}>{stat.label}</div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Close main content wrapper */}
      </div>

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialMode={bookingModalMode}
      />

      {/* Scroll to Top Button */}
      <ScrollToTop />
    </div>
  );
}
