"use client"

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { useLocale } from "@/components/providers/locale-provider";
import {
  Home,
  Calendar,
  TestTube,
  Users,
  Star,
  Settings,
  Info,
  Heart,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Microscope
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar = ({ isOpen, onToggle }: SidebarProps) => {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const navigationItems = [
    {
      icon: Home,
      label: t('header_home') || 'Home',
      action: () => {
        if (window.location.pathname !== '/') {
          router.push('/');
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    },
    ...(user ? [{
      icon: Calendar,
      label: t('header_my_appointments') || 'My Appointments',
      action: () => router.push('/appointments')
    }] : []),
    ...(user ? [{
      icon: TestTube,
      label: t('my_labs_title') || 'My Labs',
      action: () => router.push('/labs')
    }] : []),
    ...(user && user.role === 'patient' ? [{
      icon: Microscope,
      label: t('labs') || 'Labs',
      action: () => router.push('/patient-dashboard/labs')
    }] : []),
    ...(user ? [{
      icon: Heart,
      label: t('medical_records') || 'Medical Records',
      action: () => router.push('/medical-records')
    }] : []),
    {
      icon: Users,
      label: t('header_doctors') || 'Doctors',
      action: () => {
        // If user is a patient, navigate to patient dashboard doctors page
        if (user && user.role === 'patient') {
          router.push('/patient-dashboard/doctors');
        } else {
          // For non-patients, scroll to doctors section on homepage
          if (window.location.pathname !== '/') {
            router.push('/#doctors');
          } else {
            const doctorsSection = document.getElementById('doctors');
            if (doctorsSection) {
              doctorsSection.scrollIntoView({ behavior: 'smooth' });
            }
          }
        }
      }
    },
    {
      icon: Settings,
      label: t('header_services') || 'Services',
      action: () => {
        if (window.location.pathname !== '/') {
          router.push('/#services');
        } else {
          const servicesSection = document.getElementById('services');
          if (servicesSection) {
            servicesSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    },
    {
      icon: Info,
      label: t('header_about') || 'About us',
      action: () => {
        if (window.location.pathname !== '/') {
          router.push('/#about');
        } else {
          const aboutSection = document.getElementById('about');
          if (aboutSection) {
            aboutSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    },
    {
      icon: Star,
      label: t('header_reviews') || 'Reviews',
      action: () => {
        if (window.location.pathname !== '/') {
          router.push('/#reviews');
        } else {
          const reviewsSection = document.getElementById('reviews');
          if (reviewsSection) {
            reviewsSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    }
  ];

  return (
    <>
      {/* Overlay for mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={{ x: isRTL ? 280 : -280 }}
        animate={{ x: isOpen ? 0 : (isRTL ? 280 : -280) }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`fixed top-0 h-full w-[280px] bg-background/95 backdrop-blur-lg border border-border z-50 lg:z-30 shadow-xl lg:shadow-none ${isRTL ? 'sidebar-rtl right-0 border-l' : 'sidebar-ltr left-0 border-r'
          }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : 'flex-row'} justify-between p-4 sm:p-6 border-b border-border`}>
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: isOpen ? 1 : 0 }}
              transition={{ delay: isOpen ? 0.1 : 0 }}
              className="text-lg sm:text-xl font-semibold text-foreground"
            >
              {t('navigation') || 'Navigation'}
            </motion.h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggle}
              className="text-foreground/60 hover:text-foreground p-1.5 sm:p-2"
            >
              {isOpen ? (
                isRTL ? <ChevronRight size={18} className="sm:w-5 sm:h-5" /> : <ChevronLeft size={18} className="sm:w-5 sm:h-5" />
              ) : (
                isRTL ? <ChevronLeft size={18} className="sm:w-5 sm:h-5" /> : <ChevronRight size={18} className="sm:w-5 sm:h-5" />
              )}
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3 sm:p-4 overflow-y-auto">
            <div className="space-y-1 sm:space-y-2">
              {navigationItems.map((item, index) => (
                <motion.button
                  key={item.label}
                  initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                  animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : (isRTL ? 20 : -20) }}
                  transition={{ delay: isOpen ? index * 0.05 + 0.1 : 0 }}
                  onClick={() => {
                    item.action();
                    // Close sidebar on mobile after clicking
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={`w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg text-foreground/80 hover:text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 transition-all duration-200 touch-manipulation ${isRTL ? 'text-right flex-row-reverse' : 'text-left flex-row'}`}
                >
                  <item.icon size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                  {isOpen && (
                    <span className="font-medium text-sm sm:text-base">{item.label}</span>
                  )}
                </motion.button>
              ))}
            </div>
          </nav>

          {/* User Section */}
          {user && (
            <div className="p-3 sm:p-4 border-t border-border">
              <motion.button
                initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : (isRTL ? 20 : -20) }}
                transition={{ delay: isOpen ? 0.3 : 0 }}
                onClick={() => {
                  logout();
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className={`w-full flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 touch-manipulation ${isRTL ? 'text-right flex-row-reverse' : 'text-left flex-row'}`}
              >
                <LogOut size={18} className="sm:w-5 sm:h-5 flex-shrink-0" />
                {isOpen && (
                  <span className="font-medium text-sm sm:text-base">{t('header_logout') || 'Logout'}</span>
                )}
              </motion.button>
            </div>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Sidebar;