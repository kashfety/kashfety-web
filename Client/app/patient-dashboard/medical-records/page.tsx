"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MedicalRecordsSection from "@/components/MedicalRecordsSection";
import { useAuth } from "@/lib/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Heart } from "lucide-react";
import Link from "next/link";

export default function PatientMedicalRecordsPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const { t, isRTL, locale } = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  useEffect(() => {
    document.title = `${t('medical_records') || 'Medical Records'} | Kashfety`;
  }, [t]);

  // Redirect non-authenticated users
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login?redirect=/patient-dashboard/medical-records');
    }
  }, [isAuthenticated, loading, router]);

  // Verify user is a patient
  useEffect(() => {
    if (!loading && isAuthenticated && user?.role !== 'patient') {
      router.push('/');
    }
  }, [loading, isAuthenticated, user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#4DBCC4] mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'patient') {
    return null; // Will redirect via useEffect
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div 
        className="flex flex-col min-h-screen"
        onClick={() => sidebarOpen && toggleSidebar()}
      >
        {/* Header */}
        <div className="w-full px-4 sm:px-6 lg:px-8 pt-6">
          <Header onMenuToggle={toggleSidebar} />
        </div>

        {/* Page Content */}
        <div className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-6xl mx-auto"
          >
            {/* Page Header */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <Link href="/patient-dashboard">
                  <Button variant="outline" size="sm" className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
                    <ArrowLeft className="w-4 h-4 me-2" />
                    {t('back_to_dashboard') || 'Back to Dashboard'}
                  </Button>
                </Link>
              </div>
              
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
                dir={isRTL ? 'rtl' : 'ltr'}
              >
                <div className="bg-[#4DBCC4]/10 dark:bg-[#4DBCC4]/20 p-3 rounded-full">
                  <Heart className="w-8 h-8 text-[#4DBCC4]" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                  <h1 className={`text-3xl md:text-4xl font-bold text-foreground ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {t('medical_records') || 'Medical Records'}
                  </h1>
                  <p className={`text-muted-foreground mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    {t('medical_records_subtitle') || 'Manage your health information and medical history'}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Medical Records Content */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <MedicalRecordsSection key={locale} />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

