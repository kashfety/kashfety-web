"use client"

import './dashboard.css';
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/lib/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { labService, centerService } from '@/lib/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/components/providers/locale-provider';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from "next-themes";
import { toArabicNumerals, formatLocalizedNumber, formatLocalizedDate, getLocalizedMonths, getLocalizedGenders, formatLocalizedTime } from '@/lib/i18n';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  Save,
  RotateCcw,
  Building2,
  TestTube,
  Settings,
  Users,
  BarChart2,
  Activity,
  Plus,
  CheckCircle,
  XCircle,
  User,
  TrendingUp,
  Star,
  Heart,
  UserCheck,
  Mail,
  Phone,
  Edit,
  Award,
  AlertCircle,
  Thermometer,
  Menu,
  Home,
  ChevronRight,
  Stethoscope,
  MessagesSquare,
  Video,
  HelpCircle,
  Bell,
  LogOut,
  Moon,
  Sun,
  X,
  DollarSign,
  Upload
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

// Utility function for getting localized names
function getLocalizedNameUtil(item: any, currentLocale: string, fallbackField = 'name') {
  if (!item) return '';

  // For Arabic locale, try various Arabic name fields
  if (currentLocale === 'ar') {
    return item.name_ar || item.name_arabic || item.arabic_name ||
      item.first_name_ar || item.last_name_ar ||
      (item.first_name_ar && item.last_name_ar ? `${item.first_name_ar} ${item.last_name_ar}` : '') ||
      item[fallbackField] || item.name || '';
  }

  // For English or other locales, use English fields
  return item.name_en || item.english_name ||
    item[fallbackField] || item.name ||
    (item.first_name && item.last_name ? `${item.first_name} ${item.last_name}` : '') ||
    item.first_name || item.last_name || '';
}

// Generic utility to localize arbitrary text fields (e.g., descriptions, addresses)
function getLocalizedFieldValue(item: any, currentLocale: string, field: string) {
  if (!item) return '';

  if (currentLocale === 'ar') {
    const translationValue = item?.translations?.[currentLocale]?.[field];
    const candidates = [
      translationValue,
      item?.[`${field}_ar`],
      item?.[`${field}Ar`],
      item?.[`${field}_arabic`],
      item?.[`${field}Arabic`]
    ];

    for (const value of candidates) {
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
    }
  }

  return item?.[field] || item?.translations?.en?.[field] || '';
}

// TopNav Component
function TopNav({
  centerProfile,
  todayStats,
  onSignOut,
  setActiveTab
}: {
  centerProfile: any;
  todayStats: any;
  onSignOut: () => void;
  setActiveTab: (tab: string) => void;
}) {
  const { t, locale, isRTL } = useLocale();

  const displayRevenue = todayStats?.stats?.todayRevenue || 0;
  const displayAppointments = todayStats?.stats?.todayAppointments || 0;
  const nextAppointment = todayStats?.stats?.nextAppointment;

  // Helper function to get localized center name
  const getCenterDisplayName = () => {
    if (locale === 'ar' && centerProfile?.name_ar) {
      return centerProfile.name_ar;
    }
    return centerProfile?.name || t('cd_medical_center');
  };

  return (
    <div className={`h-16 border-b border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#1A1A1A] flex items-center justify-between px-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <h1 className={`text-xl font-semibold text-gray-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>
          {t('cd_welcome_back')}, {getCenterDisplayName()}
        </h1>
        {nextAppointment && (
          <div className="hidden md:flex items-center gap-2 text-sm text-gray-600 dark:text-gray-200">
            <Clock className="w-4 h-4" />
            <span>{t('cd_next')}: {getLocalizedNameUtil(nextAppointment, locale, 'patient_name')} {t('at')} <span dir="ltr">{formatLocalizedDate(new Date(`2000-01-01 ${nextAppointment.time}`), locale, 'time')}</span></span>
          </div>
        )}
      </div>

      <div className={`flex items-center gap-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white">{t('cd_upcoming_appointments')}</p>
            <p className="font-semibold text-gray-900 dark:text-white" dir="ltr">{formatLocalizedNumber(displayAppointments, locale)}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white">{t('cd_revenue')}</p>
            <p className="font-semibold text-gray-900 dark:text-white" dir="ltr">{formatLocalizedNumber(displayRevenue, locale, { style: 'currency', currency: t('currency') })}</p>
          </div>
          <div className="text-center">
            <p className="text-gray-900 dark:text-white">{t('completed')}</p>
            <p className="font-semibold text-emerald-600" dir="ltr">{formatLocalizedNumber(todayStats?.stats?.todayCompleted || 0, locale)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Locale Switcher */}
          <LocaleSwitcher />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                  {centerProfile?.name ? (
                    <span className="text-white font-medium text-sm">
                      {centerProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                    </span>
                  ) : (
                    <User className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`text-sm ${locale === 'ar' ? 'text-right' : 'text-left'}`}>
                  <p className="font-medium text-gray-900 dark:text-white">{centerProfile?.name || t('cd_medical_center')}</p>
                  <p className="text-gray-500 dark:text-gray-200">{centerProfile?.email || t('cd_default_email')}</p>
                </div>
                <ChevronRight className={`w-4 h-4 text-gray-400 ${locale === 'ar' ? 'rotate-[270deg]' : 'rotate-90'}`} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={locale === 'ar' ? 'start' : 'end'} className="w-64">
              <div className="px-2 py-2 border-b">
                <p className="font-medium text-gray-900 dark:text-white">{centerProfile?.name || t('cd_medical_center')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-200">{centerProfile?.email || t('cd_default_email')}</p>
                {centerProfile?.phone && (
                  <p className="text-sm text-gray-500 dark:text-gray-200 flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {centerProfile.phone}
                  </p>
                )}
              </div>
              <DropdownMenuItem
                className={`flex items-center gap-2 ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
                onClick={() => setActiveTab('profile')}
              >
                <User className="w-4 h-4" />
                {t('cd_profile')}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={`flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950 ${locale === 'ar' ? 'flex-row-reverse' : ''}`}
                onClick={onSignOut}
              >
                <LogOut className="w-4 h-4" />
                {t('header_logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

// CenterOverview Component
function CenterOverview({
  centerProfile,
  todayStats,
  patients,
  services,
  serviceStates,
  analytics
}: {
  centerProfile: any;
  todayStats: any;
  patients: any[];
  services: any[];
  serviceStates: Record<string, { active: boolean; fee?: string }>;
  analytics: any;
}) {
  const { t, locale, isRTL } = useLocale();

  // Helper function to get localized name with fallback
  const getLocalizedName = (item: any, currentLocale?: string, fallbackField = 'name') => {
    return getLocalizedNameUtil(item, currentLocale || locale, fallbackField);
  };

  // Calculate active services count from serviceStates
  const activeServicesCount = Object.values(serviceStates).filter(state => state.active).length;

  const stats = [
    {
      title: t('dd_total_patients'),
      value: formatLocalizedNumber(patients?.length || 0, locale),
      change: analytics?.patientGrowth || (locale === 'ar' ? '+٠%' : '+0%'),
      color: 'emerald',
      icon: Users
    },
    {
      title: t('cd_upcoming_appointments'),
      value: formatLocalizedNumber(todayStats?.stats?.todayAppointments || 0, locale),
      change: analytics?.appointmentGrowth || (locale === 'ar' ? '+٠%' : '+0%'),
      color: 'blue',
      icon: Calendar
    },
    {
      title: t('cd_todays_revenue'),
      value: formatLocalizedNumber(todayStats?.stats?.todayRevenue || 0, locale, { style: 'currency', currency: t('currency') }),
      change: analytics?.revenueGrowth || (locale === 'ar' ? '+٠%' : '+0%'),
      color: 'purple',
      icon: DollarSign
    },
    {
      title: t('cd_lab_test_services'),
      value: formatLocalizedNumber(activeServicesCount, locale),
      change: analytics?.serviceGrowth || (locale === 'ar' ? '+٠%' : '+0%'),
      color: 'yellow',
      icon: TestTube
    }
  ];

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-200">{stat.title}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white" dir="ltr">{stat.value}</p>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400" dir={isRTL ? 'rtl' : 'ltr'}><span dir="ltr">{stat.change}</span> {t('cd_from_last_month')}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-gradient-to-br from-${stat.color}-500 to-${stat.color}-600`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-0 shadow-xl shadow-emerald-500/5 gradient-card">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <TrendingUp className="w-5 h-5" />
              {t('cd_appointment_trends')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {todayStats?.appointments?.length > 0 ? (
                <div className="space-y-4">
                  {/* Weekly Trend Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400" dir="ltr">
                        {formatLocalizedNumber(todayStats.appointments.length, locale)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-200">{t('dd_today')}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400" dir="ltr">
                        {formatLocalizedNumber(todayStats.stats?.todayCompleted || 0, locale)}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-200">{t('completed')}</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400" dir="ltr">
                        {formatLocalizedNumber(todayStats.stats?.todayRevenue || 0, locale, { style: 'currency', currency: t('currency') })}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-200">{t('cd_revenue')}</div>
                    </div>
                  </div>

                  {/* Appointment Status Breakdown */}
                  <div className="space-y-3">
                    <h4 className={`font-medium text-gray-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`}>{t('cd_upcoming_appointments')} {t('cd_status')}</h4>
                    {[
                      { status: 'completed', label: t('completed'), color: 'bg-green-500' },
                      { status: 'confirmed', label: t('cd_confirmed'), color: 'bg-blue-500' },
                      { status: 'scheduled', label: t('appointments_status_scheduled'), color: 'bg-yellow-500' },
                      { status: 'cancelled', label: t('cd_cancelled'), color: 'bg-red-500' }
                    ].map(({ status, label, color }) => {
                      const count = todayStats.appointments.filter((apt: any) => apt.status === status).length;
                      const percentage = todayStats.appointments.length > 0 ? (count / todayStats.appointments.length) * 100 : 0;

                      return (
                        <div key={status} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-3 h-3 rounded-full ${color}`}></div>
                          <div className={`flex-1 flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span className={`text-sm text-gray-700 dark:text-gray-300 ${isRTL ? 'text-right' : 'text-left'}`}>{label}</span>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <span className="text-sm font-medium text-gray-900 dark:text-white" dir="ltr">{formatLocalizedNumber(count, locale)}</span>
                              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${color} transition-all duration-500`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400 w-8" dir="ltr">{formatLocalizedNumber(percentage, locale, { maximumFractionDigits: 0 })}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Next Appointment */}
                  {todayStats.stats?.nextAppointment && (
                    <div className="mt-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <h4 className="text-sm font-medium text-emerald-800 dark:text-emerald-200 mb-1">{t('dd_next_appointment')}</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        {getLocalizedNameUtil(todayStats.stats.nextAppointment, locale, 'patient_name')} • {todayStats.stats.nextAppointment.type}
                      </p>
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        {new Date(todayStats.stats.nextAppointment.date + ' ' + todayStats.stats.nextAppointment.time).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: locale !== 'ar'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                    <p className="text-sm">{t('cd_no_data')}</p>
                    <p className="text-xs text-gray-400 mt-1">{t('cd_no_appointments')}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
              <Clock className="w-5 h-5" />
              {t('cd_recent_bookings')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayStats?.appointments?.slice(0, 3)?.map((appointment: any, index: number) => (
                <div key={index} className={`flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${appointment.status === 'completed' ? 'bg-green-500' :
                    appointment.status === 'confirmed' ? 'bg-blue-500' :
                      appointment.status === 'cancelled' ? 'bg-red-500' :
                        'bg-yellow-500'
                    }`}></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {appointment.status === 'completed' ? t('appointments_status_completed') :
                        appointment.status === 'confirmed' ? t('cd_confirmed') :
                          appointment.status === 'cancelled' ? t('cd_cancelled') :
                            t('appointments_status_scheduled')}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
                      {getLocalizedNameUtil(appointment, locale, 'patient_name')} • {getLocalizedNameUtil(appointment, locale, 'test_type_name')} • {
                        appointment.booking_date && appointment.booking_time ?
                          `${formatLocalizedDate(appointment.booking_date, locale)} ${t('at')} ${formatLocalizedDate(new Date(`2000-01-01 ${appointment.booking_time}`), locale, 'time')}` :
                          appointment.appointment_date && appointment.appointment_time ?
                            `${formatLocalizedDate(appointment.appointment_date, locale)} ${t('at')} ${formatLocalizedDate(new Date(`2000-01-01 ${appointment.appointment_time}`), locale, 'time')}` :
                            t('time_tbd')
                      }
                    </p>
                  </div>
                </div>
              )) || [
                { action: t('no_recent_appointments'), time: '', patient: t('check_back_later') }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{activity.action}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{activity.patient} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// CenterPatients Component
function CenterPatients({
  patients,
  onViewPatient
}: {
  patients: any[];
  onViewPatient: (patientId: string, patientName?: string) => void;
}) {
  const { t, locale, isRTL } = useLocale();

  // Helper function to get localized patient name
  const getPatientDisplayName = (patient: any) => {
    if (locale === 'ar' && patient.name_ar) {
      return patient.name_ar;
    }
    return patient.name || `${t('patient')} ${patient.id}`;
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative p-6 rounded-2xl glass-effect">
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="p-2 rounded-xl gradient-emerald animate-glow">
            <Users className="h-5 w-5 text-white" />
          </div>
          <div className={isRTL ? 'text-right' : 'text-left'}>
            <h2 className={`text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              {t('cd_patient_management')}
            </h2>
            <p className={`text-emerald-700/80 dark:text-emerald-400/80 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              {t('cd_view_patient_records')} (<span dir="ltr">{formatLocalizedNumber(patients?.length || 0, locale)}</span> {t('cd_total_patients')})
            </p>
          </div>
        </div>
      </div>

      <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
        <CardHeader>
          <CardTitle className={`${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            {t('cd_patient_records')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {patients?.length > 0 ? patients.map((patient: any) => (
              <div key={patient.id} className={`flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div className={isRTL ? 'text-right' : 'text-left'}>
                    <p className="font-medium text-gray-900 dark:text-white" dir={isRTL ? 'rtl' : 'ltr'}>{getPatientDisplayName(patient)}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
                      {patient.age ? <><span>{t('age')}: </span><span dir="ltr">{formatLocalizedNumber(patient.age, locale)}</span></> : ''}
                      {patient.age && patient.last_visit ? ' • ' : ''}
                      {patient.last_visit ? <><span>{t('cd_last_visit')}: </span><span dir="ltr">{formatLocalizedDate(patient.last_visit, locale)}</span></> : <span>{t('cd_no_recent_visits')}</span>}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => onViewPatient(patient.id, patient.name)}
                  variant="outline"
                  size="sm"
                  className={`flex items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-900/20 dark:hover:text-emerald-400 dark:hover:border-emerald-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('cd_view_details')}
                </Button>
              </div>
            )) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_patients_registered')}</p>
                <p className="text-sm text-gray-400 text-center mt-1" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patients_will_appear')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// CenterAnalytics Component 
function CenterAnalytics({
  analytics,
  todayStats,
  patients,
  services,
  allAppointments
}: {
  analytics: any;
  todayStats: any;
  patients: any[];
  services: any[];
  allAppointments: any[];
}) {
  const { theme } = useTheme()
  const { t, locale, isRTL } = useLocale()
  const isDark = theme === "dark"

  // Define colors array at the top
  const COLORS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];

  // Color helpers
  function getAgeGroupColor(age: string) {
    const colorMap: Record<string, string> = {
      '18-30': '#10B981',
      '31-45': '#3B82F6',
      '46-60': '#8B5CF6',
      '60+': '#F59E0B'
    };
    return colorMap[age] || '#6B7280';
  }

  function getGenderColor(gender: string) {
    const colorMap: Record<string, string> = {
      'male': '#10B981',     // Emerald-500 - matches site primary
      'female': '#EC4899',   // Pink-500 - complementary color
      'other': '#8B5CF6'     // Purple-500 - tertiary color
    };
    return colorMap[gender.toLowerCase()] || '#6B7280';
  }

  // Prepare chart data with proper fallbacks and real data from allAppointments
  const monthlyTrendData = useMemo(() => {
    console.log('🔄 Calculating monthly trend data, allAppointments:', allAppointments?.length || 0);

    // Generate last 7 months data
    const months = [];
    const localizedMonths = getLocalizedMonths(locale);

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthIndex = date.getMonth();
      const monthName = locale === 'ar' ? localizedMonths[monthIndex] : date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      const month = date.getMonth();

      // Filter appointments for this month
      const monthStart = new Date(year, month, 1).toISOString().slice(0, 10);
      const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

      console.log(`📅 Processing ${monthName} (${monthStart} to ${monthEnd})`);

      const monthBookings = (allAppointments || []).filter((b: any) => {
        // Handle both booking_date and appointment_date fields
        const appointmentDate = b.booking_date || b.appointment_date;
        if (!appointmentDate) {
          console.log(`❌ No date found for appointment:`, b);
          return false;
        }
        const isInRange = appointmentDate >= monthStart && appointmentDate <= monthEnd;
        if (isInRange) {
          console.log(`✅ Found appointment for ${monthName}:`, {
            date: appointmentDate,
            status: b.status,
            fee: b.fee || b.consultation_fee,
            id: b.id
          });
        }
        return isInRange;
      });

      const monthCompleted = monthBookings.filter((b: any) => {
        // Consider both 'completed' and 'confirmed' as revenue-generating
        return b.status === 'completed' || b.status === 'confirmed';
      });
      const monthRevenue = monthCompleted.reduce((sum: number, b: any) => {
        return sum + (Number(b.fee) || Number(b.consultation_fee) || 0);
      }, 0);

      months.push({
        name: monthName,
        bookings: monthBookings.length,
        completed: monthCompleted.length,
        revenue: monthRevenue
      });
    }

    // Debug: Log the chart data
    console.log('📊 Chart Data Debug:', {
      totalAppointments: allAppointments?.length || 0,
      monthlyTrendData: months,
      currentMonth: new Date().toLocaleDateString('en-US', { month: 'short' }),
      sampleAppointment: allAppointments?.[0]
    });

    return months;
  }, [allAppointments]);

  // Generate demographics data from analytics API (which has proper patient data) or fallback to allAppointments
  const demographicsData = useMemo(() => {
    // Use analytics data if available (it has proper patient demographics)
    if (analytics?.analytics?.patientDemographics) {
      console.log('📊 Using analytics demographics data:', analytics.analytics.patientDemographics);
      return {
        ageGroups: analytics.analytics.patientDemographics.ageGroups || {},
        genderDistribution: analytics.analytics.patientDemographics.genderDistribution || {},
        testTypes: analytics.analytics.patientDemographics.testTypes || {},
        totalUniquePatients: analytics.analytics.totalPatients || 0
      };
    }

    // Fallback: try to calculate from patients array if available
    if (patients && patients.length > 0) {
      const ageGroups: Record<string, number> = { '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
      const genderDistribution: Record<string, number> = { male: 0, female: 0, other: 0 };
      const testTypes: Record<string, number> = {};

      console.log('📊 Using patients array for demographics, count:', patients.length);

      // Calculate demographics from patients data
      patients.forEach((patient: any) => {
        // Age calculation from date_of_birth
        if (patient.date_of_birth) {
          const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
          if (age >= 18 && age <= 30) ageGroups['18-30']++;
          else if (age >= 31 && age <= 45) ageGroups['31-45']++;
          else if (age >= 46 && age <= 60) ageGroups['46-60']++;
          else if (age > 60) ageGroups['60+']++;
        }

        // Gender distribution
        if (patient.gender) {
          const genderKey = patient.gender.toLowerCase();
          if (genderKey in genderDistribution) {
            genderDistribution[genderKey]++;
          } else {
            genderDistribution['other']++;
          }
        }
      });

      // Calculate test types from appointments
      (allAppointments || []).forEach((booking: any) => {
        if (booking.test_type_name || booking.lab_test_types?.name) {
          const testType = booking.test_type_name || booking.lab_test_types?.name;
          testTypes[testType] = (testTypes[testType] || 0) + 1;
        }
      });

      return {
        ageGroups,
        genderDistribution,
        testTypes,
        totalUniquePatients: patients.length
      };
    }

    // Third fallback: try to calculate from allAppointments if they have patient demographic data
    if (allAppointments && allAppointments.length > 0) {
      const ageGroups: Record<string, number> = { '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
      const genderDistribution: Record<string, number> = { male: 0, female: 0, other: 0 };
      const testTypes: Record<string, number> = {};
      const uniquePatients = new Set<string>();

      console.log('📊 Using appointments data for demographics, count:', allAppointments.length);

      (allAppointments || []).forEach((booking: any) => {
        if (booking.patient_id) {
          uniquePatients.add(booking.patient_id);

          // Age calculation from patient data in booking
          if (booking.patient_date_of_birth || booking.patients?.date_of_birth) {
            const dateOfBirth = booking.patient_date_of_birth || booking.patients?.date_of_birth;
            const age = new Date().getFullYear() - new Date(dateOfBirth).getFullYear();
            if (age >= 18 && age <= 30) ageGroups['18-30']++;
            else if (age >= 31 && age <= 45) ageGroups['31-45']++;
            else if (age >= 46 && age <= 60) ageGroups['46-60']++;
            else if (age > 60) ageGroups['60+']++;
          }

          // Gender distribution
          const gender = booking.patient_gender || booking.patients?.gender;
          if (gender) {
            const genderKey = gender.toLowerCase();
            if (genderKey in genderDistribution) {
              genderDistribution[genderKey]++;
            } else {
              genderDistribution['other']++;
            }
          }
        }

        // Test types
        if (booking.test_type_name || booking.lab_test_types?.name) {
          const testType = booking.test_type_name || booking.lab_test_types?.name;
          testTypes[testType] = (testTypes[testType] || 0) + 1;
        }
      });

      return {
        ageGroups,
        genderDistribution,
        testTypes,
        totalUniquePatients: uniquePatients.size
      };
    }

    // Final fallback: empty data
    console.warn('📊 No demographics data available - neither analytics, patients, nor appointments data found');
    return {
      ageGroups: {},
      genderDistribution: {},
      testTypes: {},
      totalUniquePatients: 0
    };
  }, [analytics, patients, allAppointments]);

  // Prepare demographics data with better handling using calculated data
  const ageGroupData = demographicsData.ageGroups
    ? Object.entries(demographicsData.ageGroups)
      .filter(([age, count]) => (count as number) > 0)
      .map(([age, count]) => ({
        name: age,
        value: count as number,
        fill: getAgeGroupColor(age)
      }))
    : [];

  const genderLabels = getLocalizedGenders(locale);
  const genderData = demographicsData.genderDistribution
    ? Object.entries(demographicsData.genderDistribution)
      .filter(([gender, count]) => (count as number) > 0)
      .map(([gender, count]) => ({
        name: gender === 'male' ? genderLabels.male : gender === 'female' ? genderLabels.female : gender.charAt(0).toUpperCase() + gender.slice(1),
        value: count as number,
        fill: getGenderColor(gender)
      }))
    : [];

  const testTypeData = demographicsData.testTypes
    ? Object.entries(demographicsData.testTypes)
      .filter(([test, count]) => (count as number) > 0)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([test, count], index) => ({
        name: test,
        value: count as number,
        fill: COLORS[index % COLORS.length]
      }))
    : [];

  // Analytics stats with proper calculations - only count revenue from completed bookings
  // Calculate total revenue from completed AND confirmed bookings (both generate revenue)
  const allCompletedBookings = allAppointments?.filter((b: any) =>
    b.status === 'completed' || b.status === 'confirmed'
  ) || [];
  const calculatedTotalRevenue = allCompletedBookings.reduce((sum: number, b: any) =>
    sum + (Number(b.fee) || Number(b.consultation_fee) || 0), 0
  );

  const totalRevenue = calculatedTotalRevenue > 0 ? calculatedTotalRevenue : (analytics?.analytics?.totalRevenue || 0);
  const todayRevenue = analytics?.analytics?.todayRevenue || todayStats?.stats?.todayRevenue || 0;
  const totalBookings = analytics?.analytics?.totalBookings || 0;
  const completedBookings = analytics?.analytics?.completedBookings || 0;
  const todayBookings = analytics?.analytics?.todayBookings || todayStats?.stats?.todayAppointments || 0;
  const totalPatients = analytics?.analytics?.totalPatients || patients?.length || 0;
  const completionRate = totalBookings > 0 ? Math.round((completedBookings / totalBookings) * 100) : 0;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header with Theme Toggle */}
      <div className="relative p-6 rounded-2xl glass-effect">
        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="p-2 rounded-xl gradient-emerald animate-glow">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <h2 className={`text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                {t('cd_analytics_demographics')}
              </h2>
              <p className={`text-emerald-700/80 dark:text-emerald-400/80 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                {t('cd_center_performance_insights')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_total_revenue')}</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400" dir="ltr">
                  {formatLocalizedNumber(totalRevenue, locale, { style: 'currency', currency: t('currency') })}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>{t('today')}: <span dir="ltr">{formatLocalizedNumber(todayRevenue, locale, { style: 'currency', currency: 'SYP' })}</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_total_bookings')}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" dir="ltr">
                  {formatLocalizedNumber(totalBookings, locale)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>{t('today')}: <span dir="ltr">{formatLocalizedNumber(todayBookings, locale)}</span></p>
              </div>
              <Calendar className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_completion_rate')}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400" dir="ltr">
                  {formatLocalizedNumber(completionRate, locale)}%
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}><span dir="ltr">{formatLocalizedNumber(completedBookings, locale)}</span> {t('of')} <span dir="ltr">{formatLocalizedNumber(totalBookings, locale)}</span></p>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <CardContent className="p-4">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_total_patients')}</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400" dir="ltr">
                  {formatLocalizedNumber(totalPatients, locale)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_unique_patients_served')}</p>
              </div>
              <Users className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends Chart */}
      <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            {t('cd_lab_test_trends_revenue')}
          </CardTitle>
          <CardDescription className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_monthly_bookings_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} margin={{ top: 5, right: 30, left: 20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                <XAxis
                  dataKey="name"
                  stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  angle={0}
                  textAnchor="middle"
                  height={60}
                  interval={0}
                />
                <YAxis
                  stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatLocalizedNumber(value, locale)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)",
                    border: `2px solid ${isDark ? "#10B981" : "#10B981"}`,
                    borderRadius: "12px",
                    boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.2)" : "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)",
                    color: isDark ? "#f8fafc" : "#0f172a",
                    direction: isRTL ? 'rtl' : 'ltr',
                    backdropFilter: "blur(12px)",
                    WebkitBackdropFilter: "blur(12px)",
                    textShadow: isDark ? "0 1px 2px rgba(0, 0, 0, 0.5)" : "0 1px 2px rgba(255, 255, 255, 0.8)"
                  }}
                  formatter={(value, name) => [
                    name === 'revenue' ? formatLocalizedNumber(Number(value), locale, { style: 'currency', currency: t('currency') }) :
                      `${formatLocalizedNumber(Number(value), locale)}`,
                    name === 'bookings' ? t('cd_total_bookings') :
                      name === 'completed' ? t('cd_completed_tests') :
                        name === 'revenue' ? t('cd_revenue') : name
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: "#10B981", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
                  name={t('cd_total_bookings')}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                />
                <Line
                  type="monotone"
                  dataKey="completed"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                  name={t('cd_completed_tests')}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  animationBegin={300}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8B5CF6"
                  strokeWidth={3}
                  dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#8B5CF6", strokeWidth: 2 }}
                  name={`${t('cd_revenue')} (${t('currency')})`}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
                  animationBegin={600}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Demographics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Age Distribution */}
        <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <User className="h-5 w-5 text-emerald-600" />
              {t('cd_age_distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ageGroupData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroupData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                    <XAxis
                      dataKey="name"
                      stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                      fontSize={12}
                    />
                    <YAxis
                      stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                      fontSize={12}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.98)" : "rgba(255, 255, 255, 0.98)",
                        border: `2px solid ${isDark ? "#10B981" : "#10B981"}`,
                        borderRadius: "12px",
                        boxShadow: isDark ? "0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(16, 185, 129, 0.2)" : "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)",
                        color: isDark ? "#f8fafc" : "#0f172a",
                        backdropFilter: "blur(12px)",
                        WebkitBackdropFilter: "blur(12px)",
                        textShadow: isDark ? "0 1px 2px rgba(0, 0, 0, 0.5)" : "0 1px 2px rgba(255, 255, 255, 0.8)"
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {ageGroupData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <User className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_age_data')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <Users className="h-5 w-5 text-emerald-600" />
              {t('cd_gender_distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {genderData.length > 0 ? (
              <div>
                <div className="h-[200px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {genderData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.fill}
                            stroke={isDark ? "#1f2937" : "#ffffff"}
                            strokeWidth={2}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => {
                          const formattedValue = formatLocalizedNumber(Number(value), locale);
                          const percentage = ((Number(value) / genderData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1);
                          return [
                            `${formattedValue} ${t('cd_patients')} (${formatLocalizedNumber(Number(percentage), locale)}%)`,
                            name
                          ];
                        }}
                        labelFormatter={(label) => `${t('cd_gender')}: ${label}`}
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.98)",
                          border: "2px solid #10B981",
                          borderRadius: "12px",
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(16, 185, 129, 0.1)",
                          color: "#1f2937 !important",
                          fontSize: "14px",
                          fontWeight: "600",
                          padding: "12px 16px",
                          backdropFilter: "blur(12px)",
                          WebkitBackdropFilter: "blur(12px)",
                          zIndex: 9999
                        }}
                        wrapperStyle={{
                          zIndex: 9999,
                          outline: "none",
                          color: "#1f2937 !important"
                        }}
                        wrapperClassName="pie-chart-tooltip"
                        cursor={{ fill: "transparent" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className={`flex justify-center gap-6 mt-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  {genderData.map((entry, index) => {
                    const total = genderData.reduce((sum, item) => sum + item.value, 0);
                    const percentage = ((entry.value / total) * 100).toFixed(1);
                    return (
                      <div key={entry.name} className={`flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/80 dark:hover:bg-gray-700/50 transition-all duration-200 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div
                          className="w-4 h-4 rounded-full ring-2 ring-white dark:ring-gray-800 shadow-sm"
                          style={{ backgroundColor: entry.fill }}
                        ></div>
                        <div className={`${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{entry.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-200 font-medium">
                            <span dir="ltr">{formatLocalizedNumber(entry.value, locale)}</span>
                            <span className="mx-1 opacity-60">•</span>
                            <span dir="ltr">{formatLocalizedNumber(Number(percentage), locale)}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                  <p className="text-base font-medium text-gray-600 dark:text-gray-200 mb-1 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_gender_data')}</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_data_will_appear_patients')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Popular Tests */}
        <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
              <TestTube className="h-5 w-5 text-emerald-600" />
              {t('cd_popular_tests')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testTypeData.length > 0 ? (
              <div className="space-y-3">
                {testTypeData.map((test, index) => (
                  <div key={test.name} className={`flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: test.fill }}
                      ></div>
                      <span className={`font-medium text-gray-900 dark:text-white text-sm ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{test.name}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-200 font-medium" dir="ltr">{formatLocalizedNumber(test.value, locale)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <TestTube className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-sm text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_test_data')}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// CenterScheduleManagement Component with Doctor Dashboard Design
function CenterScheduleManagement({ selectedServices }: { selectedServices: any[] }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, locale, isRTL } = useLocale();

  // Define schedule config type (similar to doctor dashboard)
  type DayConfig = {
    isAvailable: boolean;
    startTime: string;
    endTime: string;
    breakStart: string;
    breakEnd: string;
    duration: number;
    notes: string;
  };

  type ScheduleConfig = {
    [key: number]: DayConfig;
  };

  const [scheduleConfig, setScheduleConfig] = useState<ScheduleConfig>({});
  const [selectedTestType, setSelectedTestType] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Persistent form states for each test type (like doctor-dashboard centerFormStates)
  const [typeFormStates, setTypeFormStates] = useState<Record<string, ScheduleConfig>>({});

  // Track which test types have been initialized
  const [initializedTypes, setInitializedTypes] = useState<Set<string>>(new Set());

  // Days of week configuration (like doctor dashboard)
  const DAYS_OF_WEEK = [
    { value: 0, labelKey: 'day_sunday', label: 'Sunday' },
    { value: 1, labelKey: 'day_monday', label: 'Monday' },
    { value: 2, labelKey: 'day_tuesday', label: 'Tuesday' },
    { value: 3, labelKey: 'day_wednesday', label: 'Wednesday' },
    { value: 4, labelKey: 'day_thursday', label: 'Thursday' },
    { value: 5, labelKey: 'day_friday', label: 'Friday' },
    { value: 6, labelKey: 'day_saturday', label: 'Saturday' }
  ] as const;

  // Helper function to get day config with defaults
  const getDayConfig = (dayIndex: number): DayConfig => {
    // Try to get from current form state first
    if (scheduleConfig[dayIndex]) {
      return scheduleConfig[dayIndex];
    }

    // Fallback to saved form state for this type
    if (selectedTestType && typeFormStates[selectedTestType]?.[dayIndex]) {
      return typeFormStates[selectedTestType][dayIndex];
    }

    // Default config
    return {
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      duration: 30,
      notes: ''
    };
  };

  // Update day config function
  const updateDayConfig = (dayIndex: number, field: keyof DayConfig, value: any) => {
    console.log('� [CenterSchedule] Updating day config:', { dayIndex, field, value });
    setScheduleConfig(prev => ({
      ...prev,
      [dayIndex]: {
        ...getDayConfig(dayIndex),
        [field]: value
      }
    }));
  };

  // Update day config function with persistence - override the above
  const updateDayConfigWithPersistence = (dayIndex: number, field: keyof DayConfig, value: any) => {
    if (!selectedTestType) return;

    console.log('🔧 [CenterSchedule] Updating day config:', { dayIndex, field, value, selectedTestType });

    const newConfig = { ...getDayConfig(dayIndex), [field]: value };

    // Update current form state
    setScheduleConfig(prev => ({
      ...prev,
      [dayIndex]: newConfig
    }));

    // Also update persistent form state for this type
    setTypeFormStates(prev => {
      const updated = {
        ...prev,
        [selectedTestType]: {
          ...prev[selectedTestType],
          [dayIndex]: newConfig
        }
      };

      // Save to localStorage as backup
      try {
        localStorage.setItem(`centerScheduleStates_${user?.id}`, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      return updated;
    });
  };

  // Generate time slots function (like doctor dashboard)
  const generateTimeSlots = (
    startTime: string,
    endTime: string,
    breakStart?: string,
    breakEnd?: string,
    duration: number = 30
  ) => {
    const slots: { time: string; duration: number }[] = [];
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);
    const breakStartTime = breakStart ? new Date(`2000-01-01T${breakStart}:00`) : null;
    const breakEndTime = breakEnd ? new Date(`2000-01-01T${breakEnd}:00`) : null;

    let current = new Date(start);

    while (current < end) {
      const timeStr = current.toTimeString().substring(0, 5);

      // Skip break time
      if (breakStartTime && breakEndTime && current >= breakStartTime && current < breakEndTime) {
        current = new Date(current.getTime() + duration * 60000);
        continue;
      }

      slots.push({
        time: timeStr,
        duration: duration
      });

      current = new Date(current.getTime() + duration * 60000);
    }

    return slots;
  };

  const generateSlotsForDay = (dayIndex: number) => {
    const config = getDayConfig(dayIndex);
    if (!config.isAvailable) return [];

    return generateTimeSlots(
      config.startTime,
      config.endTime,
      config.breakStart,
      config.breakEnd,
      config.duration
    );
  };

  // Load saved form states from localStorage on component mount
  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`centerScheduleStates_${user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTypeFormStates(parsed);
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }
  }, [user?.id]);

  // Handle test type selection with auto-save (like doctor-dashboard center switching)
  const handleTypeSelection = async (newTypeId: string) => {
    // If switching away from a previously selected type, auto-save current schedule
    if (selectedTestType && selectedTestType !== newTypeId) {
      try {
        // Only auto-save if there are actual changes to save
        const hasChanges = DAYS_OF_WEEK.some(d => getDayConfig(d.value).isAvailable);
        if (hasChanges) {
          await saveSchedule();
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Continue with type selection even if auto-save fails
      }
    }

    setSelectedTestType(newTypeId);

    // Always load from server (like refresh button) to get latest data
    if (newTypeId) {
      console.log('🔄 [CenterSchedule] Loading schedule from server for test type:', newTypeId);
      await loadScheduleForType(newTypeId);

      // Mark as initialized after loading
      if (!initializedTypes.has(newTypeId)) {
        console.log('✅ [CenterSchedule] Marking test type as initialized:', newTypeId);
        setInitializedTypes(prev => new Set([...prev, newTypeId]));
      }
    } else {
      // Clear current config
      console.log('🧹 [CenterSchedule] Clearing schedule config (no test type selected)');
      setScheduleConfig({});
    }
  };

  const loadScheduleForType = async (testTypeId: string) => {
    if (!user?.id) {
      console.log('⚠️ [CenterSchedule] Cannot load schedule - no user ID');
      return;
    }

    console.log('🔍 [CenterSchedule] Loading schedule for test type:', testTypeId, 'center:', user.id);
    setLoading(true);
    try {
      const response = await centerService.getLabSchedule(testTypeId);
      console.log('📅 [CenterSchedule] Schedule response:', response);

      if (response?.schedule) {
        console.log('✅ [CenterSchedule] Found', response.schedule.length, 'day schedules');
        // Convert server schedule format to component format
        const newConfig: ScheduleConfig = {};

        response.schedule.forEach((daySchedule: any) => {
          console.log('📆 [CenterSchedule] Processing day', daySchedule.day_of_week, ':', daySchedule);
          const hasSlots = Array.isArray(daySchedule?.time_slots) && daySchedule.time_slots.length > 0;
          newConfig[daySchedule.day_of_week] = {
            isAvailable: daySchedule.is_available ?? (hasSlots ? true : false),
            startTime: daySchedule.time_slots?.[0]?.time || '09:00',
            endTime: daySchedule.time_slots && daySchedule.time_slots.length > 0
              ? (() => {
                const lastSlot = daySchedule.time_slots[daySchedule.time_slots.length - 1];
                const endTime = new Date(`2000-01-01T${lastSlot.time}:00`);
                endTime.setMinutes(endTime.getMinutes() + (lastSlot.duration || 30));
                return endTime.toTimeString().substring(0, 5);
              })()
              : '17:00',
            breakStart: daySchedule.break_start || '',
            breakEnd: daySchedule.break_end || '',
            duration: daySchedule.time_slots?.[0]?.duration || 30,
            notes: daySchedule.notes || ''
          };
        });

        console.log('✅ [CenterSchedule] Converted schedule config:', newConfig);
        console.log('✅ [CenterSchedule] Setting schedule config state for test type:', testTypeId);
        setScheduleConfig(newConfig);

        // Also update typeFormStates to persist the loaded config
        setTypeFormStates(prev => ({
          ...prev,
          [testTypeId]: newConfig
        }));
        console.log('✅ [CenterSchedule] Updated typeFormStates for test type:', testTypeId);
      } else {
        console.log('⚠️ [CenterSchedule] No schedule data in response');
      }
    } catch (error) {
      console.error('❌ [CenterSchedule] Failed to load schedule:', error);
      toast({
        title: t('error'),
        description: t('failed_load_schedule_config'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSchedule = async () => {
    if (!selectedTestType || !user?.id) {
      toast({
        title: t('error'),
        description: t('please_select_test_type_first'),
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      console.log('💾 [CenterSchedule] Saving schedule for test type:', selectedTestType);
      console.log('💾 [CenterSchedule] Schedule config:', scheduleConfig);

      // Convert component format to server format
      const schedule = DAYS_OF_WEEK.map((day) => {
        const dayConfig = getDayConfig(day.value);
        const slots = dayConfig.isAvailable ? generateSlotsForDay(day.value) : [];

        return {
          day_of_week: day.value,
          is_available: dayConfig.isAvailable,
          slots: slots, // Change from time_slots to slots
          break_start: dayConfig.breakStart || undefined,
          break_end: dayConfig.breakEnd || undefined,
          notes: dayConfig.notes || `${day.label} schedule for center ${user.id}`
        };
      });

      console.log('💾 [CenterSchedule] Converted schedule for API:', schedule);

      const response = await centerService.saveLabSchedule(selectedTestType, schedule);
      console.log('✅ [CenterSchedule] Save response:', response);

      toast({
        title: t('success'),
        description: t('schedule_saved_success'),
        variant: "default"
      });
    } catch (error) {
      console.error('❌ [CenterSchedule] Failed to save schedule:', error);
      toast({
        title: t('error'),
        description: t('failed_save_schedule_config'),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const copySchedule = (fromDay: number, toDay: number) => {
    const sourceConfig = getDayConfig(fromDay);
    if (sourceConfig) {
      setScheduleConfig(prev => ({
        ...prev,
        [toDay]: { ...sourceConfig }
      }));
    }
  };

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {selectedServices.length === 0 ? (
        <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <TestTube className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center" dir={isRTL ? 'rtl' : 'ltr'}>
                  {t('no_services_for_schedule')}
                </h3>
                <p className="text-gray-600 dark:text-gray-200 text-center" dir={isRTL ? 'rtl' : 'ltr'}>
                  {t('no_services_schedule_desc')}
                </p>
                <div className="mt-4">
                  <Button
                    onClick={() => {
                      toast({
                        title: t('switch_to_services'),
                        description: t('enable_services_first')
                      });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <TestTube className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                    <span dir={isRTL ? 'rtl' : 'ltr'}>{t('go_to_services')}</span>
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Header */}
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Clock className="h-5 w-5" />
              <h2 className={`text-xl font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('center_schedule_management')}</h2>
            </div>
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Button
                onClick={() => selectedTestType && loadScheduleForType(selectedTestType)}
                variant="outline"
                size="sm"
                disabled={loading || !selectedTestType}
              >
                <RotateCcw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                <span dir={isRTL ? 'rtl' : 'ltr'}>{t('refresh')}</span>
              </Button>
              <Button
                onClick={saveSchedule}
                disabled={saving || !selectedTestType}
                size="sm"
              >
                <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                <span dir={isRTL ? 'rtl' : 'ltr'}>{saving ? (t('saving')) : (t('save_schedule'))}</span>
              </Button>
            </div>
          </div>

          {/* Test Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                <TestTube className="h-5 w-5" />
                {t('test_type_selection')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label className={`text-base font-medium ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('select_test_type_manage')}</Label>
                  <p className={`text-sm text-gray-600 dark:text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('test_type_selection_desc')}</p>
                </div>

                <Select value={selectedTestType} onValueChange={handleTypeSelection} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('cd_test_type_desc_schedule')} />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedServices.length === 0 ? (
                      <div className="p-4 text-center">
                        <TestTube className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('no_services_selected')}</p>
                        <p className="text-xs text-gray-400 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('select_services_first')}</p>
                      </div>
                    ) : (
                      selectedServices.map((type) => {
                        // Get localized name with fallback
                        const displayName = locale === 'ar' && type.name_ar ? type.name_ar : type.name;
                        return (
                          <SelectItem key={type.id} value={type.id}>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <TestTube className="h-4 w-4" />
                              <span className={isRTL ? 'text-right' : 'text-left'}>{displayName}</span>
                              {type.category && <Badge variant="secondary" className="text-xs">{type.category}</Badge>}
                            </div>
                          </SelectItem>
                        );
                      })
                    )}
                  </SelectContent>
                </Select>

                {selectedTestType && (
                  <div className="p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <CheckCircle className="h-5 w-5 text-blue-500" />
                      <span className={`font-medium text-blue-700 dark:text-blue-300 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {t('selected')}: {locale === 'ar' && selectedServices.find(t => t.id === selectedTestType)?.name_ar ? selectedServices.find(t => t.id === selectedTestType)?.name_ar : selectedServices.find(t => t.id === selectedTestType)?.name}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selectedTestType && (
            <>
              {loading && (
                <div className={`flex items-center gap-2 text-gray-600 dark:text-gray-200 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></div>
                  <span dir={isRTL ? 'rtl' : 'ltr'}>{t('loading_schedule_config')}</span>
                </div>
              )}

              {/* Weekly Schedule */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <Calendar className="h-5 w-5" />
                    {(t('weekly_schedule_for'))} {selectedServices.find((type: any) => type.id === selectedTestType)?.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {DAYS_OF_WEEK.map(day => {
                    const config = getDayConfig(day.value);
                    const slots = generateSlotsForDay(day.value);

                    return (
                      <div key={day.value} className="space-y-4 p-4 border rounded-lg">
                        {/* Day Header */}
                        <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className={`text-lg font-medium ${isRTL ? 'text-right' : 'text-left'}`}>{t(day.labelKey) || day.label}</h3>
                          <Switch
                            checked={config.isAvailable || false}
                            onCheckedChange={(checked) => updateDayConfigWithPersistence(day.value, 'isAvailable', checked)}
                            disabled={loading}
                            isRTL={isRTL}
                          />
                        </div>

                        {config.isAvailable && (
                          <div className={`space-y-4 ${isRTL ? 'mr-4' : 'ml-4'}`}>
                            {/* Time Range */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('start_time')}</Label>
                                <Input
                                  type="time"
                                  value={config.startTime || '09:00'}
                                  onChange={(e) => updateDayConfigWithPersistence(day.value, 'startTime', e.target.value)}
                                  disabled={loading}
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                />
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('end_time')}</Label>
                                <Input
                                  type="time"
                                  value={config.endTime || '17:00'}
                                  onChange={(e) => updateDayConfigWithPersistence(day.value, 'endTime', e.target.value)}
                                  disabled={loading}
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                />
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('slot_duration_minutes')}</Label>
                                <Input
                                  type="number"
                                  min="15"
                                  max="120"
                                  step="15"
                                  value={config.duration || 30}
                                  onChange={(e) => updateDayConfigWithPersistence(day.value, 'duration', parseInt(e.target.value))}
                                  disabled={loading}
                                  dir="ltr"
                                  className={isRTL ? 'text-right' : 'text-left'}
                                  placeholder={formatLocalizedNumber(30, locale)}
                                />
                              </div>
                            </div>

                            {/* Break Time */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('break_start_optional')}</Label>
                                <Input
                                  type="time"
                                  value={config.breakStart || ''}
                                  onChange={(e) => updateDayConfigWithPersistence(day.value, 'breakStart', e.target.value)}
                                  disabled={loading}
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                />
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('break_end_optional')}</Label>
                                <Input
                                  type="time"
                                  value={config.breakEnd || ''}
                                  onChange={(e) => updateDayConfigWithPersistence(day.value, 'breakEnd', e.target.value)}
                                  disabled={loading}
                                  dir={isRTL ? 'rtl' : 'ltr'}
                                />
                              </div>
                            </div>

                            {/* Generated Slots Preview */}
                            {slots.length > 0 && (
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <Label className={`text-sm font-medium text-gray-600 dark:text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                  {(t('generated_time_slots_total')).replace('{count}', formatLocalizedNumber(slots.length, locale))}
                                </Label>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {slots.slice(0, 8).map((slot, index) => (
                                    <Badge key={index} variant="outline" className="text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                                      {formatLocalizedTime(slot.time, locale)}
                                    </Badge>
                                  ))}
                                  {slots.length > 8 && (
                                    <Badge variant="secondary" className="text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                                      {(t('more_count')).replace('{count}', formatLocalizedNumber(slots.length - 8, locale))}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Copy from other days */}
                            <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                              <span className={`text-sm text-gray-600 dark:text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('copy_from')}  </span>
                              {DAYS_OF_WEEK.filter(d => d.value !== day.value && getDayConfig(d.value).isAvailable).map(sourceDay => (
                                <Button
                                  key={sourceDay.value}
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copySchedule(sourceDay.value, day.value)}
                                  className="text-xs"
                                  disabled={loading}
                                >
                                  {t(sourceDay.labelKey) || sourceDay.label}
                                </Button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Schedule Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                    <CheckCircle className="h-5 w-5" />
                    {t('schedule_summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className={`text-sm font-medium text-gray-600 dark:text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('working_days')}</Label>
                      <p className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}><span dir="ltr">{formatLocalizedNumber(Object.values(scheduleConfig).filter(config => config.isAvailable).length, locale)}</span> {t('days')}</p>
                    </div>
                    <div>
                      <Label className={`text-sm font-medium text-gray-600 dark:text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('total_weekly_slots')}</Label>
                      <p className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}><span dir="ltr">{formatLocalizedNumber(DAYS_OF_WEEK.reduce((total, day) => total + generateSlotsForDay(day.value).length, 0), locale)}</span> {t('slots')}</p>
                    </div>
                    <div>
                      <Label className={`text-sm font-medium text-gray-600 dark:text-gray-200 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('test_type')}</Label>
                      <p className={`text-lg font-semibold ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{selectedServices.find((type: any) => type.id === selectedTestType)?.name}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
];

// Sidebar Component
function Sidebar({
  activeTab,
  setActiveTab,
  toast,
  onSignOut
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toast: any;
  onSignOut: () => void;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useTheme();
  const { t, isRTL } = useLocale();

  function handleNavigation(tab: string) {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  }

  function NavItem({
    tab,
    icon: Icon,
    children,
    isActive = false,
  }: {
    tab: string;
    icon: any;
    children: React.ReactNode;
    isActive?: boolean;
  }) {
    return (
      <button
        onClick={() => handleNavigation(tab)}
        className={`w-full flex items-center ${isRTL ? 'flex-row-reverse' : ''} px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-${isRTL ? 'right' : 'left'} ${isActive
          ? `bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-${isRTL ? 'l' : 'r'}-2 border-emerald-500`
          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
          } ${isCollapsed ? 'justify-center' : ''}`}
        title={isCollapsed ? children?.toString() : ''}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
        {!isCollapsed && <span>{children}</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`lg:hidden fixed top-4 ${isRTL ? 'right-4' : 'left-4'} z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23] transition-all duration-300 hover:scale-110 hover:translate-y-[-2px] hover:shadow-lg`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      <nav
        className={`
          fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-[70] bg-white dark:bg-[#0F0F12] transform transition-all duration-300 ease-in-out
          lg:static lg:translate-x-0 border-${isRTL ? 'l' : 'r'} border-gray-200 dark:border-[#1F1F23]
          ${isCollapsed ? 'lg:w-16 sidebar-collapsed' : 'lg:w-64'}
          ${isMobileMenuOpen
            ? "translate-x-0 w-64"
            : isRTL
              ? "translate-x-full w-64"
              : "-translate-x-full w-64"
          }
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`h-16 flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23] ${isCollapsed ? 'px-2' : 'px-6'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
              <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              {!isCollapsed && (
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('center_portal')}
                </span>
              )}
            </div>

            {/* Collapse Button - Desktop Only */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"
                title={t('collapse_sidebar')}
              >
                <Menu className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            )}

            {/* Expand Button when Collapsed */}
            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className={`hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors absolute top-4 ${isRTL ? 'left-2' : 'right-2'}`}
                title={t('expand_sidebar')}
              >
                <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            )}
          </div>

          {/* Navigation */}
          <div className={`flex-1 overflow-y-auto py-4 ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="space-y-6">
              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-200">
                    {t('dashboard')}
                  </div>
                )}
                <div className={isCollapsed ? 'space-y-2' : ''}>
                  <NavItem tab="overview" icon={Home} isActive={activeTab === "overview"}>
                    {t('overview')}
                  </NavItem>
                  <NavItem tab="appointments" icon={Calendar} isActive={activeTab === "appointments"}>
                    {t('appointments')}
                  </NavItem>
                  <NavItem tab="patients" icon={Users} isActive={activeTab === "patients"}>
                    {t('patients')}
                  </NavItem>
                  <NavItem tab="analytics" icon={BarChart2} isActive={activeTab === "analytics"}>
                    {t('analytics')}
                  </NavItem>
                </div>
              </div>

              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-200">
                    {t('management')}
                  </div>
                )}
                <div className={isCollapsed ? 'space-y-2' : ''}>
                  <NavItem tab="schedule" icon={Clock} isActive={activeTab === "schedule"}>
                    {t('schedule')}
                  </NavItem>
                  <NavItem tab="services" icon={TestTube} isActive={activeTab === "services"}>
                    {t('services')}
                  </NavItem>
                  <NavItem tab="profile" icon={Settings} isActive={activeTab === "profile"}>
                    {t('profile')}
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className={`py-4 border-t border-gray-200 dark:border-[#1F1F23] ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="space-y-1">

              <button
                onClick={onSignOut}
                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/20 ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? (t('sign_out')) : ''}
              >
                <LogOut className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="ml-3">{t('sign_out')}</span>}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[65] lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}

export default function CenterDashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t, locale, isRTL } = useLocale();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');

  // Data states
  const [today, setToday] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [allTestTypes, setAllTestTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string>('');
  const [schedule, setSchedule] = useState<any[]>([]);

  // Additional data states (like doctor dashboard)
  const [allAppointments, setAllAppointments] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [centerProfile, setCenterProfile] = useState<any>(null);
  const [todayStats, setTodayStats] = useState<any>(null);

  // Modal states (like doctor dashboard)
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  // Profile form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    name_ar: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    description: ''
  });

  const getProfileField = (field: string) => {
    if (!centerProfile) return '';
    return getLocalizedFieldValue(centerProfile, locale, field) || (centerProfile as any)?.[field] || '';
  };

  // Loading and saving states
  const [servicesLoading, setServicesLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [servicesSaving, setServicesSaving] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Services management state (like doctor-dashboard centers)
  const [serviceStates, setServiceStates] = useState<Record<string, { active: boolean; fee?: string }>>({});

  // Batch selection state
  const [selectedTestTypes, setSelectedTestTypes] = useState<Set<string>>(new Set());
  const [batchFee, setBatchFee] = useState('');

  // Create lab test type dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTestType, setNewTestType] = useState({
    code: '',
    name: '',
    category: 'lab' as 'lab' | 'imaging',
    default_fee: ''
  });

  // Schedule management state (like doctor-dashboard schedule)
  const [dayConfigs, setDayConfigs] = useState<Record<number, {
    isAvailable: boolean;
    start?: string;
    end?: string;
    slot?: number;
    breakStart?: string;
    breakEnd?: string;
    notes?: string
  }>>({});

  // Persistent form states for each test type (like doctor-dashboard centerFormStates)
  const [typeFormStates, setTypeFormStates] = useState<Record<string, Record<number, {
    isAvailable: boolean;
    start?: string;
    end?: string;
    slot?: number;
    breakStart?: string;
    breakEnd?: string;
    notes?: string
  }>>>({});

  // Track which test types have been initialized (like doctor-dashboard initializedCenters)
  const [initializedTypes, setInitializedTypes] = useState<Set<string>>(new Set());
  const [lastFetchedTypeId, setLastFetchedTypeId] = useState<string | null>(null);

  // Load saved form states from localStorage on component mount
  useEffect(() => {
    if (user?.id) {
      try {
        const saved = localStorage.getItem(`centerScheduleStates_${user.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setTypeFormStates(parsed);
        }
      } catch (error) {
        console.error('Failed to load from localStorage:', error);
      }
    }
  }, [user?.id]);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'center')) router.replace('/login');
  }, [user, loading, router]);

  // Ensure center record exists for this user
  useEffect(() => {
    const setupCenter = async () => {
      if (!user || !user.id || user.role !== 'center') return;

      try {
        // Check center status
        const statusResponse = await fetch('/api/auth/center/setup', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();

          // Check if the API response indicates success
          if (!statusData.success) {
            console.warn('Setup API returned unsuccessful response:', statusData);
            toast({
              title: "Setup Warning",
              description: statusData.error || "Unable to verify center setup status.",
              variant: "destructive",
            });
            return;
          }

          if (statusData.needsSetup) {
            console.log('Center record needs setup, creating...');

            // Create center record
            const setupResponse = await fetch('/api/auth/center/setup', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userInfo: {
                  name: user.name || statusData.user?.name || 'Medical Center',
                  phone: user.phone || statusData.user?.phone || '',
                  email: user.email || statusData.user?.email || '',
                  address: 'Address not provided'
                }
              }),
            });

            if (setupResponse.ok) {
              const setupData = await setupResponse.json();
              if (setupData.success) {
                console.log('✅ Center record created successfully:', setupData.center?.id);
                toast({
                  title: "Center Setup Complete",
                  description: "Your center record has been created successfully.",
                });
              } else {
                console.error('Center setup failed:', setupData.error);
                toast({
                  title: "Center Setup Warning",
                  description: setupData.error || "There was an issue setting up your center record.",
                  variant: "destructive",
                });
              }
            } else {
              const errorData = await setupResponse.json();
              console.error('Center setup failed:', errorData.error);
              toast({
                title: "Center Setup Warning",
                description: "There was an issue setting up your center record. Some features may not work properly.",
                variant: "destructive",
              });
            }
          } else {
            console.log('✅ Center record exists:', statusData.center?.id, '(', statusData.center?.name, ')');
          }
        } else {
          const errorData = await statusResponse.json();
          console.error('Setup status check failed:', errorData);
          toast({
            title: "Setup Error",
            description: errorData.error || "Unable to check center setup status.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Center setup error:', error);
        toast({
          title: "Setup Error",
          description: "Unable to verify center setup. Please refresh the page.",
          variant: "destructive",
        });
      }
    };

    setupCenter();
  }, [user, toast]);

  // Load initial data - ensure we have a complete user object
  useEffect(() => {
    console.log('useEffect for loadCenterData triggered:', {
      userId: user?.id,
      role: user?.role,
      loading,
      userExists: !!user
    });

    // Only load if we have a complete user object and it's a center
    if (user?.role === 'center' && user?.id) {
      console.log('Calling loadCenterData...');
      loadCenterData();
    } else if (user && user.role !== 'center') {
      console.log('User is not a center, role:', user.role);
    } else if (!loading && !user) {
      console.log('No user found and not loading, might need redirect');
    }
  }, [user]);

  // Load schedule when test type is selected
  useEffect(() => {
    if (selectedType) {
      // Clear initialization flag for the new type if it hasn't been initialized
      if (!initializedTypes.has(selectedType)) {
        // This will trigger initialization in the next useEffect
      }
      loadScheduleForType(selectedType);
    } else {
      setDayConfigs({});
    }
  }, [selectedType]);

  useEffect(() => {
    // Initialize day configs only after server schedule for this type has been fetched
    if (
      selectedType &&
      !initializedTypes.has(selectedType) &&
      lastFetchedTypeId === selectedType
    ) {
      initializeDayConfigs();
    }
  }, [schedule, selectedType, initializedTypes, lastFetchedTypeId]);

  // Update profile form when center profile loads
  useEffect(() => {
    console.log('Profile form useEffect triggered:', { centerProfile, userEmail: user?.email });
    if (centerProfile) {
      console.log('Setting profile form with:', centerProfile);
      setProfileForm({
        name: centerProfile.name || '',
        name_ar: centerProfile.name_ar || '',
        email: centerProfile.email || user?.email || '',
        phone: centerProfile.phone || '',
        address: centerProfile.address || '',
        website: centerProfile.website || '',
        description: centerProfile.description || ''
      });
    } else {
      console.log('No centerProfile, using default form');
      setProfileForm({
        name: '',
        name_ar: '',
        email: user?.email || '',
        phone: '',
        address: '',
        website: '',
        description: ''
      });
    }
  }, [centerProfile, user?.email]);

  const loadCenterData = async () => {
    console.log('loadCenterData called, user:', { id: user?.id, role: user?.role });
    try {
      setServicesLoading(true);
      const [todayRes, labTestTypesRes, patientsRes, analyticsRes, profileRes] = await Promise.all([
        centerService.upcomingBookings().catch(() => ({ bookings: [] })),
        fetch(`/api/auth/center/lab-test-types`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        }).then(r => r.json()).catch(() => ({ labTestTypes: [], success: false })),
        centerService.listPatients().catch(() => ({ patients: [] })),
        centerService.getAnalytics().catch(() => ({ analytics: null })),
        centerService.getProfile().catch(() => ({ profile: null }))
      ]);

      console.log('Raw responses:', {
        todayCount: todayRes?.appointments?.length || todayRes?.bookings?.length,
        labTestTypesCount: labTestTypesRes?.labTestTypes?.length,
        labTestTypesSuccess: labTestTypesRes?.success
      });

      setToday(todayRes?.appointments || todayRes?.bookings || []);

      // Set lab test types with their current service settings
      if (labTestTypesRes?.success && Array.isArray(labTestTypesRes.labTestTypes)) {
        console.log('📋 [Frontend] Received lab test types:', labTestTypesRes.labTestTypes.map((t: any) => ({ id: t.id, name: t.name, code: t.code, category: t.category, is_active: t.is_active })));
        setAllTestTypes(labTestTypesRes.labTestTypes);

        // Initialize service states from the loaded data
        const newServiceStates: Record<string, { active: boolean; fee?: string }> = {};
        labTestTypesRes.labTestTypes.forEach((testType: any) => {
          newServiceStates[testType.id] = {
            active: testType.is_active || false,
            fee: testType.base_fee?.toString() || '0'
          };
        });
        setServiceStates(newServiceStates);

        console.log('✅ [Frontend] Loaded lab test types with services:', {
          totalTypes: labTestTypesRes.labTestTypes.length,
          activeServices: labTestTypesRes.activeServices,
          testTypes: labTestTypesRes.labTestTypes.map((t: any) => t.name)
        });
      } else {
        console.warn('❌ [Frontend] Failed to load lab test types:', labTestTypesRes);
        setAllTestTypes([]);
      }

      setPatients(patientsRes?.patients || []);
      setAnalytics(analyticsRes);

      // Debug profile data structure
      console.log('Profile API response:', profileRes);
      console.log('Profile data:', profileRes?.profile);
      console.log('Center data:', profileRes?.center);

      // Handle the correct API response structure
      const profileData = profileRes?.center || profileRes?.profile || profileRes || null;
      console.log('Final profile data:', profileData);

      setCenterProfile(profileData);

      // Use appointments or bookings as appointments
      const appointmentData = todayRes?.appointments || todayRes?.bookings || [];
      console.log('📅 Appointment data:', {
        appointments: todayRes?.appointments?.length,
        bookings: todayRes?.bookings?.length,
        finalData: appointmentData.length,
        sample: appointmentData[0]
      });
      setAllAppointments(appointmentData);

      // Create stats from appointment data
      const upcomingBookings = appointmentData;
      const completedToday = upcomingBookings.filter((b: any) => b.status === 'completed').length;
      // Only count scheduled and confirmed appointments for upcoming count
      const upcomingCount = upcomingBookings.filter((b: any) => b.status === 'scheduled' || b.status === 'confirmed').length;
      // Only count revenue from completed appointments
      const revenueToday = upcomingBookings
        .filter((b: any) => b.status === 'completed')
        .reduce((sum: number, b: any) => sum + (Number(b.fee) || 0), 0);
      const nextAppointment = upcomingBookings.find((b: any) => b.status === 'scheduled' || b.status === 'confirmed');

      setTodayStats({
        stats: {
          todayAppointments: upcomingCount,
          todayCompleted: completedToday,
          todayRevenue: revenueToday,
          nextAppointment: nextAppointment ? {
            patient_name: nextAppointment.patient_name,
            time: nextAppointment.appointment_time,
            date: nextAppointment.appointment_date,
            type: nextAppointment.test_type_name || 'Lab Test'
          } : null
        },
        appointments: upcomingBookings
      });

      // Service states are already set from lab test types API above
      // No need for additional processing since the API returns combined data

      // Auto-select first active service for schedule if none selected
      if (!selectedType && labTestTypesRes.success && Array.isArray(labTestTypesRes.labTestTypes)) {
        const firstActiveService = labTestTypesRes.labTestTypes.find((testType: any) => testType.is_active);
        if (firstActiveService) {
          setSelectedType(firstActiveService.id.toString());
        }
      }

    } catch (error) {
      console.error('Failed to load center data:', error);
      toast({
        title: t('error'),
        description: t('failed_to_load_data'),
        variant: 'destructive'
      });
    } finally {
      setServicesLoading(false);
    }
  };

  const loadScheduleForType = async (typeId: string) => {
    try {
      setScheduleLoading(true);

      if (!typeId) {
        setSchedule([]);
        setScheduleLoading(false);
        return;
      }

      const res = await centerService.getLabSchedule(typeId);
      const scheduleData = res?.schedule || [];
      setSchedule(scheduleData);

      // Force UI to reflect DB configs for this type
      const newConfigs = buildConfigsFromSchedule(typeId, scheduleData);
      setTypeFormStates(prev => ({
        ...prev,
        [typeId]: newConfigs
      }));
      setInitializedTypes(prev => new Set([...prev, typeId]));
      setLastFetchedTypeId(typeId);

    } catch (error) {
      console.error('Failed to load schedule:', error);
      setSchedule([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // Build day configs from schedule data (like doctor-dashboard buildConfigsFromSchedule)
  const buildConfigsFromSchedule = (typeId: string, scheduleData: any[]) => {
    const configs: Record<number, any> = {};
    for (const s of scheduleData) {
      configs[s.day_of_week] = {
        isAvailable: !!s.is_available,
        start: s.start_time || '',
        end: s.end_time || '',
        slot: s.slot_duration || 30,
        breakStart: s.break_start || '',
        breakEnd: s.break_end || '',
        notes: s.notes || ''
      };
    }
    return configs;
  };

  // Initialize day configs (like doctor-dashboard initializeDayConfigs)
  const initializeDayConfigs = () => {
    if (!selectedType) return;

    const savedConfigs = typeFormStates[selectedType] || {};
    setDayConfigs(savedConfigs);
  };

  // Get day config with fallback (like doctor-dashboard getDayConfig)
  const getDayConfig = (day: number) => {
    if (!selectedType) return { isAvailable: false };

    // Try to get from current form state first
    if (dayConfigs[day]) {
      return dayConfigs[day];
    }

    // Fallback to saved form state for this type
    if (typeFormStates[selectedType]?.[day]) {
      return typeFormStates[selectedType][day];
    }

    // Default config
    return {
      isAvailable: false,
      start: '09:00',
      end: '17:00',
      slot: 30,
      breakStart: '',
      breakEnd: '',
      notes: ''
    };
  };

  // Update day configuration (like doctor-dashboard updateDayConfig)
  const updateDayConfig = (day: number, key: string, value: any) => {
    if (!selectedType) return;

    const newConfig = { ...getDayConfig(day), [key]: value };

    // Update current form state
    setDayConfigs(prev => ({
      ...prev,
      [day]: newConfig
    }));

    // Also update persistent form state for this type
    setTypeFormStates(prev => {
      const updated = {
        ...prev,
        [selectedType]: {
          ...prev[selectedType],
          [day]: newConfig
        }
      };

      // Save to localStorage as backup
      try {
        localStorage.setItem(`centerScheduleStates_${user?.id}`, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      return updated;
    });
  };

  // Refresh schedule for current type (like doctor-dashboard refreshSchedule)
  const refreshSchedule = async () => {
    if (!selectedType) return;

    // Remove type from initialized set to force re-initialization
    setInitializedTypes(prev => {
      const newSet = new Set(prev);
      newSet.delete(selectedType);
      return newSet;
    });

    await loadScheduleForType(selectedType);
  };

  // Service management functions (like doctor center management)
  const toggleServiceActive = (typeId: string) => {
    setServiceStates(prev => ({
      ...prev,
      [typeId]: {
        active: !prev[typeId]?.active,
        fee: prev[typeId]?.fee
      }
    }));
  };

  const updateServiceFee = (typeId: string, fee: string) => {
    setServiceStates(prev => ({
      ...prev,
      [typeId]: {
        active: prev[typeId]?.active ?? false,
        fee
      }
    }));
  };

  const saveServices = async () => {
    try {
      setServicesSaving(true);

      // Validate that we have valid service states
      const activeServices = Object.entries(serviceStates).filter(([, state]) => state.active);

      if (activeServices.length === 0) {
        // If no services are active, just save empty array
        console.log('Saving empty services array');
      } else {
        // Validate that all active services have valid lab test type IDs
        const validTypeIds = allTestTypes.map(type => type.id);
        const invalidServices = activeServices.filter(([typeId]) => !validTypeIds.includes(typeId));

        if (invalidServices.length > 0) {
          throw new Error(`Invalid lab test types selected: ${invalidServices.map(([id]) => id).join(', ')}`);
        }
      }

      const payload = activeServices.map(([typeId, state]) => ({
        lab_test_type_id: typeId,
        base_fee: state.fee ? Number(state.fee) : undefined,
        is_active: true
      }));

      console.log('Saving services payload:', payload);

      const response = await fetch('/api/auth/center/lab-services', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ services: payload })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Services save failed:', { status: response.status, result });
        throw new Error(result.error || `Failed to save services (${response.status})`);
      }

      if (!result.success) {
        console.error('Services save unsuccessful:', result);
        throw new Error(result.error || (t('services_save_failed')));
      }

      console.log('✅ Services saved successfully');

      toast({
        title: t('success'),
        description: t('services_saved')
      });

      // Reload lab test types with updated service settings instead of all center data
      try {
        const labTestTypesRes = await fetch(`/api/auth/center/lab-test-types`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (labTestTypesRes.ok) {
          const labTestTypesData = await labTestTypesRes.json();
          if (labTestTypesData.success && Array.isArray(labTestTypesData.labTestTypes)) {
            setAllTestTypes(labTestTypesData.labTestTypes);

            // Update service states from the fresh data
            const newServiceStates: Record<string, { active: boolean; fee?: string }> = {};
            labTestTypesData.labTestTypes.forEach((testType: any) => {
              newServiceStates[testType.id] = {
                active: testType.is_active || false,
                fee: testType.base_fee?.toString() || '0'
              };
            });
            setServiceStates(newServiceStates);

            console.log('Services reloaded after save:', {
              totalTypes: labTestTypesData.labTestTypes.length,
              activeServices: labTestTypesData.activeServices
            });
          }
        }
      } catch (error) {
        console.warn('Failed to reload services after save:', error);
        // Don't throw error here, the save was successful
      }

    } catch (error: any) {
      console.error('Save services error:', error);
      toast({
        title: t('error'),
        description: error?.message || 'Failed to save services',
        variant: 'destructive'
      });
    } finally {
      setServicesSaving(false);
    }
  };

  // Batch selection handlers
  const toggleTestTypeSelection = (testTypeId: string) => {
    setSelectedTestTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(testTypeId)) {
        newSet.delete(testTypeId);
      } else {
        newSet.add(testTypeId);
      }
      return newSet;
    });
  };

  const selectAllTestTypes = () => {
    setSelectedTestTypes(new Set(allTestTypes.map((t: any) => t.id)));
  };

  const deselectAllTestTypes = () => {
    setSelectedTestTypes(new Set());
  };

  const handleBatchEnable = () => {
    console.log('📦 [Batch] Enabling', selectedTestTypes.size, 'test types');
    setServiceStates(prev => {
      const updated = { ...prev };
      selectedTestTypes.forEach(typeId => {
        updated[typeId] = {
          ...updated[typeId],
          active: true,
          fee: updated[typeId]?.fee || batchFee || ''
        };
      });
      return updated;
    });
    toast({
      title: t('success'),
      description: `${selectedTestTypes.size} ${t('test_types_enabled')}`
    });
  };

  const handleBatchDisable = () => {
    console.log('📦 [Batch] Disabling', selectedTestTypes.size, 'test types');
    setServiceStates(prev => {
      const updated = { ...prev };
      selectedTestTypes.forEach(typeId => {
        updated[typeId] = {
          ...updated[typeId],
          active: false
        };
      });
      return updated;
    });
    toast({
      title: t('success'),
      description: `${selectedTestTypes.size} ${t('test_types_disabled')}`
    });
  };

  const handleBatchSetFee = () => {
    if (!batchFee) {
      toast({ title: t('error'), description: t('please_enter_fee'), variant: 'destructive' });
      return;
    }
    console.log('📦 [Batch] Setting fee', batchFee, 'for', selectedTestTypes.size, 'test types');
    setServiceStates(prev => {
      const updated = { ...prev };
      selectedTestTypes.forEach(typeId => {
        updated[typeId] = {
          ...updated[typeId],
          fee: batchFee
        };
      });
      return updated;
    });
    toast({
      title: t('success'),
      description: `${t('fee_set_for')} ${selectedTestTypes.size} ${t('test_types')}`
    });
  };

  // Create new lab test type
  const handleCreateTestType = async () => {
    if (!newTestType.code || !newTestType.name) {
      toast({ title: t('error'), description: t('please_fill_required_fields'), variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const response = await labService.createLabTestType({
        code: newTestType.code,
        name: newTestType.name,
        category: newTestType.category,
        default_fee: newTestType.default_fee ? Number(newTestType.default_fee) : undefined
      });

      const newType = response.data;
      console.log('✅ [Frontend] Created new lab test type:', newType);

      toast({ title: t('success'), description: t('lab_test_type_created') });

      // Reset form and close dialog
      setNewTestType({ code: '', name: '', category: 'lab', default_fee: '' });
      setShowCreateDialog(false);

      // Reload all data from server to get the fresh list with the new test type
      console.log('🔄 [Frontend] Reloading data to fetch new test type from server...');
      await loadCenterData();
    } catch (error: any) {
      console.error('Failed to create lab test type:', error);
      toast({
        title: t('error'),
        description: error.response?.data?.error || t('failed_create_lab_test_type'),
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  // Schedule management functions (like doctor schedule management)
  const generateSlots = (start: string, end: string, duration: number): Array<{ time: string; duration: number }> => {
    if (!start || !end || !duration) return [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const slots: Array<{ time: string; duration: number }> = [];

    for (let m = startMin; m + duration <= endMin; m += duration) {
      const h = Math.floor(m / 60).toString().padStart(2, '0');
      const mm = (m % 60).toString().padStart(2, '0');
      slots.push({ time: `${h}:${mm}`, duration });
    }
    return slots;
  };

  // Handle test type selection with auto-save (like doctor-dashboard center switching)
  const handleTypeSelection = async (newTypeId: string) => {
    // If switching away from a previously selected type, auto-save current schedule
    if (selectedType && selectedType !== newTypeId) {
      try {
        // Only auto-save if there are actual changes to save
        const hasChanges = DAYS.some(d => getDayConfig(d.value).isAvailable);
        if (hasChanges) {
          await saveSchedule();
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Continue with type selection even if auto-save fails
      }
    }

    setSelectedType(newTypeId);
  };

  const saveSchedule = async () => {
    if (!selectedType) {
      toast({
        title: t('error'),
        description: t('selectTest'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setScheduleSaving(true);

      // Build schedule array for API - only include days that are marked as available
      const scheduleData = DAYS
        .filter(d => getDayConfig(d.value).isAvailable) // Use getDayConfig for consistency
        .map(d => {
          const config = getDayConfig(d.value);
          const slots = generateSlots(config.start || '', config.end || '', Number(config.slot || 30));
          return {
            day_of_week: d.value,
            is_available: true,
            start_time: config.start,
            end_time: config.end,
            slots,
            break_start: config.breakStart || null,
            break_end: config.breakEnd || null,
            notes: config.notes || null,
            slot_duration: Number(config.slot || 30)
          };
        })
        .filter(d => d.slots.length > 0); // Only include days with actual slots

      const res = await centerService.saveLabSchedule(selectedType, scheduleData as any);

      if (res) {
        // Update the schedule state with the response data
        setSchedule(res.schedule || scheduleData);

        toast({
          title: t('success'),
          description: t('schedule_saved')
        });

        // Don't reload schedule to avoid resetting form state
        // The form state should remain as the user configured it
      }

    } catch (error: any) {
      toast({
        title: t('error'),
        description: error?.message || 'Failed to save schedule',
        variant: 'destructive'
      });
    } finally {
      setScheduleSaving(false);
    }
  };

  // Handler functions (like doctor dashboard)
  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const endpoint = `/api/auth/center/update-booking-status`;
      console.log('🔄 Updating booking status:', { appointmentId, status, endpoint });

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ bookingId: appointmentId, status })
      });

      console.log('📡 Status update response:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update appointment status');
      }

      toast({
        title: t('success'),
        description: `Appointment ${status} successfully`,
      });
      loadCenterData(); // Refresh data
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: t('error'),
        description: error instanceof Error ? error.message : 'Failed to update appointment',
        variant: 'destructive'
      });
    }
  };

  const handleUploadResult = (appointment: any) => {
    setSelectedAppointment(appointment);
    setShowUploadModal(true);
    setUploadFile(null);
    setUploadNotes('');
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !selectedAppointment) {
      toast({
        title: t('error'),
        description: 'Please select a file to upload',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUploading(true);

      const response = await centerService.uploadResult(
        selectedAppointment.id,
        uploadFile,
        uploadNotes
      );

      if (response) {
        toast({
          title: t('success'),
          description: 'Lab result uploaded successfully',
        });
        setShowUploadModal(false);
        loadCenterData(); // Refresh data
      }
    } catch (error) {
      console.error('Error uploading result:', error);
      toast({
        title: t('error'),
        description: 'Failed to upload lab result',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleViewPatient = async (patientId: string, patientName?: string) => {
    try {
      // Load comprehensive patient data using proper API methods
      const [patientResponse, labHistoryResponse, medicalRecordsResponse] = await Promise.all([
        centerService.getPatientDetails(patientId),
        centerService.getPatientLabHistory(patientId),
        centerService.getPatientMedicalRecords(patientId)
      ]);

      let patientData: any = {
        id: patientId,
        name: patientName || `Patient ${patientId}`
      };

      // Handle API response data directly (no need for .json())
      if (patientResponse?.patient) {
        patientData = { ...patientData, ...patientResponse.patient };
      }

      patientData.labHistory = labHistoryResponse?.labHistory || [];
      patientData.medicalRecords = medicalRecordsResponse?.medicalRecords || [];

      setSelectedPatient(patientData);
      setShowPatientModal(true);
    } catch (error) {
      console.error('Error loading patient:', error);
      // Fallback to basic patient info
      setSelectedPatient({
        id: patientId,
        name: patientName || `Patient ${patientId}`,
        labHistory: [],
        medicalRecords: []
      });
      setShowPatientModal(true);
    }
  };

  const handleViewAllPatients = () => {
    setActiveTab('patients');
  };

  // Profile form handlers
  const updateProfileForm = (field: string, value: string) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim() || !profileForm.email.trim()) {
      toast({
        title: t('error'),
        description: t('name_email_required'),
        variant: 'destructive'
      });
      return;
    }

    setProfileSaving(true);
    try {
      console.log('Saving profile with data:', profileForm);
      const response = await centerService.updateProfile(profileForm);
      console.log('Profile update response:', response);

      // Handle the correct API response structure
      const updatedProfile = response?.center || response?.profile || response;
      setCenterProfile(updatedProfile);

      toast({
        title: t('success'),
        description: t('profile_updated'),
      });

      // Reload data to refresh the display
      await loadCenterData();
    } catch (error: any) {
      console.error('Profile update error:', error);
      console.error('Error response:', error.response?.data);

      const errorMessage = error.response?.data?.error || error.message || t('profile_update_failed');
      toast({
        title: t('error'),
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear all local storage
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      localStorage.removeItem(`centerScheduleStates_${user?.id}`);

      toast({
        title: t('success'),
        description: t('signed_out_successfully'),
      });

      // Redirect to login page
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: t('error'),
        description: t('sign_out_failed'),
        variant: 'destructive'
      });
    }
  };

  if (!user || user.role !== 'center') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20 relative" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-10 -right-10 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-emerald-600/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-gradient-to-br from-teal-400/10 to-teal-600/10 rounded-full blur-3xl animate-float-delayed"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-400/5 to-transparent rounded-full animate-breathe"></div>
      </div>

      <div className={`flex h-screen relative z-10 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} toast={toast} onSignOut={handleSignOut} />

        <div className="w-full flex flex-1 flex-col">
          <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23]">
            <TopNav
              centerProfile={centerProfile}
              todayStats={todayStats}
              onSignOut={handleSignOut}
              setActiveTab={setActiveTab}
            />
            {/* Subtle emerald glow behind user controls */}
            <div className="pointer-events-none absolute top-0 right-0 translate-x-8 -translate-y-8 w-48 h-48 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full blur-3xl"></div>
          </header>

          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0F0F12]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <div className={`p-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                <h1 className={`text-2xl font-bold text-gray-900 dark:text-white mb-6 ${isRTL ? 'text-right mr-0' : 'text-left ml-0'}`} dir={isRTL ? 'rtl' : 'ltr'} style={{ textAlign: isRTL ? 'right' : 'left' }}>
                  {t('center_dashboard')}
                </h1>
              </div>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6">
                <CenterOverview
                  centerProfile={centerProfile}
                  todayStats={todayStats}
                  patients={patients}
                  services={allTestTypes}
                  serviceStates={serviceStates}
                  analytics={analytics}
                />
              </TabsContent>

              {/* Appointments Tab */}
              <TabsContent value="appointments" className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="relative p-6 rounded-2xl glass-effect">
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Calendar className="h-5 w-5 text-white" /></div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h2 className={`text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_appointment_management')}</h2>
                      <p className={`text-emerald-700/80 dark:text-emerald-400/80 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_manage_appointments_desc')}</p>
                    </div>
                  </div>
                </div>

                {/* Today's Appointments */}
                <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card" dir={isRTL ? 'rtl' : 'ltr'}>
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      {t('cd_upcoming_appointments')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {todayStats?.appointments?.length > 0 ? todayStats.appointments.map((appointment: any, index: number) => (
                        <div key={index} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-all duration-200 space-y-3 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800">
                          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className={`w-3 h-3 rounded-full ${appointment.status === 'completed' ? 'bg-green-500' :
                                appointment.status === 'confirmed' ? 'bg-blue-500' :
                                  appointment.status === 'cancelled' ? 'bg-red-500' :
                                    'bg-yellow-500'
                                }`}></div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="font-medium text-gray-900 dark:text-white" dir={isRTL ? 'rtl' : 'ltr'}>{getLocalizedNameUtil(appointment, locale, 'patient_name')}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
                                  {getLocalizedNameUtil(appointment, locale, 'test_type_name')} • <span dir="ltr">{appointment.appointment_time ? formatLocalizedTime(appointment.appointment_time, locale) : appointment.booking_time ? formatLocalizedTime(appointment.booking_time, locale) : t('cd_na')}</span> • <span dir="ltr">{formatLocalizedNumber(appointment.fee || appointment.consultation_fee || 0, locale, { style: 'currency', currency: t('currency') })}</span>
                                </p>
                              </div>
                            </div>
                            <Badge className={`px-3 py-1 ${appointment.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' :
                              appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700' :
                                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' :
                                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700'
                              }`} dir={isRTL ? 'rtl' : 'ltr'}>
                              {appointment.status === 'completed' ? (t('appointments_status_completed')) :
                                appointment.status === 'confirmed' ? (t('appointments_status_confirmed')) :
                                  appointment.status === 'cancelled' ? (t('appointments_status_cancelled')) :
                                    appointment.status === 'scheduled' ? (t('appointments_status_scheduled')) :
                                      (t(`appointments_status_${appointment.status}`) || appointment.status)}
                            </Badge>
                          </div>

                          {/* Action Buttons */}
                          <div className={`flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {appointment.status === 'scheduled' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                                  className={`${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                  {t('cd_confirm')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                                  className={`${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <XCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                  {t('cd_cancel')}
                                </Button>
                              </>
                            )}
                            {appointment.status === 'confirmed' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'completed')}
                                  className={`${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <CheckCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                  {t('cd_complete')}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateAppointmentStatus(appointment.id, 'cancelled')}
                                  className={`${isRTL ? 'flex-row-reverse' : ''}`}
                                >
                                  <XCircle className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                  {t('cancel')}
                                </Button>
                              </>
                            )}
                            {appointment.status === 'completed' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleUploadResult(appointment)}
                                className={`${isRTL ? 'flex-row-reverse' : ''}`}
                              >
                                <Upload className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                {t('cd_upload_result')}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewPatient(appointment.patient_id, appointment.patient_name)}
                              className={`${isRTL ? 'flex-row-reverse' : ''} hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors`}
                            >
                              <User className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                              {t('cd_view_patient')}
                            </Button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-gray-500 dark:text-gray-400 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_appointments_today')}</p>
                          <p className="text-sm text-gray-400 mt-1 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_appointments_will_appear')}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Patients Tab */}
              <TabsContent value="patients" className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <CenterPatients patients={patients} onViewPatient={handleViewPatient} />
              </TabsContent>

              {/* Analytics Tab */}
              <TabsContent value="analytics" className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <CenterAnalytics
                  analytics={analytics}
                  todayStats={todayStats}
                  patients={patients}
                  services={services}
                  allAppointments={allAppointments}
                />
              </TabsContent>

              {/* Schedule Tab */}
              <TabsContent value="schedule" className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="relative p-6 rounded-2xl glass-effect">
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Clock className="h-5 w-5 text-white" /></div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h2 className={`text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`}>{t('cd_schedule_management')}</h2>
                      <p className={`text-emerald-700/80 dark:text-emerald-400/80 ${isRTL ? 'text-right' : 'text-left'}`}>{t('cd_configure_operating_hours')}</p>
                    </div>
                  </div>
                </div>

                {/* New Center Schedule Management Component */}
                <CenterScheduleManagement
                  selectedServices={allTestTypes.filter(testType =>
                    serviceStates[testType.id]?.active
                  )}
                />
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="relative p-6 rounded-2xl glass-effect">
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><TestTube className="h-5 w-5 text-white" /></div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h2 className={`text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_services_management')}</h2>
                      <p className={`text-emerald-700/80 dark:text-emerald-400/80 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_configure_lab_services')}</p>
                    </div>
                  </div>
                </div>

                {/* Available Services Card */}
                <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                  <CardHeader>
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div>
                        <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                          <Building2 className="w-5 h-5" />
                          {t('available_services')}
                        </CardTitle>
                        <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                          {t('services_description')}
                        </CardDescription>
                      </div>
                      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                          >
                            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                            {t('add_new_type')}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('create_lab_test_type')}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label htmlFor="code">{t('code')} *</Label>
                              <Input
                                id="code"
                                value={newTestType.code}
                                onChange={(e) => setNewTestType(prev => ({ ...prev, code: e.target.value }))}
                                placeholder="e.g., CBC, MRI"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="name">{t('name')} *</Label>
                              <Input
                                id="name"
                                value={newTestType.name}
                                onChange={(e) => setNewTestType(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="e.g., Complete Blood Count"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="category">{t('category')} *</Label>
                              <Select
                                value={newTestType.category}
                                onValueChange={(value: 'lab' | 'imaging') => setNewTestType(prev => ({ ...prev, category: value }))}
                                dir={isRTL ? 'rtl' : 'ltr'}
                              >
                                <SelectTrigger id="category">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="lab">{t('lab')}</SelectItem>
                                  <SelectItem value="imaging">{t('imaging')}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="default_fee">{t('default_fee')}</Label>
                              <Input
                                id="default_fee"
                                type="number"
                                value={newTestType.default_fee}
                                onChange={(e) => setNewTestType(prev => ({ ...prev, default_fee: e.target.value }))}
                                placeholder={locale === 'ar' ? toArabicNumerals('0.00') : '0.00'}
                                dir={isRTL ? 'rtl' : 'ltr'}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={creating}>
                              {t('cancel')}
                            </Button>
                            <Button onClick={handleCreateTestType} disabled={creating}>
                              {creating ? (t('creating')) : (t('create'))}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {servicesLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className={`flex items-center gap-2 text-gray-500 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                          <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          {t('loading_services')}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Batch Actions Toolbar */}
                        {allTestTypes.length > 0 && (
                          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="flex flex-col gap-4">
                              {/* Selection Controls */}
                              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300" dir={isRTL ? 'rtl' : 'ltr'}>
                                    <span dir="ltr">{formatLocalizedNumber(selectedTestTypes.size || 0, locale)}</span> {t('selected')}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={selectAllTestTypes}
                                  >
                                    {t('select_all')}
                                  </Button>
                                  {selectedTestTypes.size > 0 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={deselectAllTestTypes}
                                    >
                                      {t('deselect_all')}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {/* Batch Actions */}
                              {selectedTestTypes.size > 0 && (
                                <div className={`flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBatchEnable}
                                    className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700"
                                  >
                                    <CheckCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    {t('enable_selected')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleBatchDisable}
                                  >
                                    <XCircle className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                                    {t('disable_selected')}
                                  </Button>
                                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                    <Input
                                      type="number"
                                      placeholder={t('fee')}
                                      value={batchFee}
                                      onChange={(e) => setBatchFee(e.target.value)}
                                      className={`w-32 ${isRTL ? 'text-right' : 'text-left'}`}
                                      dir={isRTL ? 'rtl' : 'ltr'}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={handleBatchSetFee}
                                    >
                                      {t('set_fee')}
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        {allTestTypes.map((testType: any) => {
                          const state = serviceStates[testType.id] || { active: false, fee: '' };
                          const isSelected = selectedTestTypes.has(testType.id);
                          // Get localized name with fallback
                          const displayName = locale === 'ar' && testType.name_ar ? testType.name_ar : testType.name;
                          return (
                            <div key={testType.id} className={`p-4 border rounded-lg transition-colors ${isSelected ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600'}`}>
                              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleTestTypeSelection(testType.id)}
                                  />
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 flex items-center justify-center">
                                    <TestTube className="w-6 h-6 text-emerald-700 dark:text-emerald-300" />
                                  </div>
                                  <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <h4 className="font-semibold text-gray-900 dark:text-white" dir={isRTL ? 'rtl' : 'ltr'}>{displayName}</h4>
                                    <p className="text-sm text-gray-500 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                      {getLocalizedFieldValue(testType, locale, 'description') || testType.description || t('cd_no_description')}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2">
                                      <span className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
                                        {t('duration')}: <span dir="ltr">{formatLocalizedNumber(testType.default_duration || 30, locale)}</span> {t('minutes')}
                                      </span>
                                      <span className="text-xs text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
                                        {t('category')}: {testType.category ? (testType.category === 'lab' ? (t('lab')) : testType.category === 'imaging' ? (t('imaging')) : testType.category) : (t('general'))}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <Label htmlFor={`fee-${testType.id}`} className="text-sm font-medium">
                                        {(t('fee'))} ({t('currency')})
                                      </Label>
                                      <Input
                                        id={`fee-${testType.id}`}
                                        type="number"
                                        placeholder={locale === 'ar' ? toArabicNumerals('0.00') : '0.00'}
                                        value={state.fee || ''}
                                        onChange={(e) => {
                                          setServiceStates(prev => ({
                                            ...prev,
                                            [testType.id]: { ...prev[testType.id], fee: e.target.value }
                                          }));
                                        }}
                                        className="w-24 text-center"
                                        min="0"
                                        step="0.01"
                                        dir={isRTL ? 'rtl' : 'ltr'}
                                      />
                                    </div>
                                  </div>
                                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                                    <Label htmlFor={`service-${testType.id}`} className="text-sm font-medium">
                                      {state.active ? t('enabled') : t('disabled')}
                                    </Label>
                                    <Switch
                                      id={`service-${testType.id}`}
                                      checked={state.active}
                                      onCheckedChange={(checked) => {
                                        setServiceStates(prev => ({
                                          ...prev,
                                          [testType.id]: { ...prev[testType.id], active: checked }
                                        }));
                                      }}
                                      isRTL={isRTL}
                                    />
                                  </div>
                                </div>
                              </div>

                              {state.active && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      <span className="text-gray-600 dark:text-gray-200">{t('online_booking_enabled')}</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      <span className="text-gray-600 dark:text-gray-200">{t('instant_confirmation')}</span>
                                    </div>
                                    <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                      <span className="text-gray-600 dark:text-gray-200">{t('automated_scheduling')}</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className={`flex gap-4 pt-6 border-t border-gray-200 dark:border-gray-700 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          saveServices();
                        }}
                        disabled={servicesSaving}
                        className={`flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                      >
                        {servicesSaving ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Save className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        )}
                        {t('save_services')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          loadCenterData();
                          toast({
                            title: t('services_reset'),
                            description: t('services_reset_desc')
                          });
                        }}
                        disabled={servicesLoading}
                        className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                      >
                        <RotateCcw className={`w-4 h-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('reset')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Selected Services Card View */}
                <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      {t('active_services')}
                    </CardTitle>
                    <CardDescription className={isRTL ? 'text-right' : 'text-left'}>
                      {t('active_services_description')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const activeServices = allTestTypes.filter(testType =>
                        serviceStates[testType.id]?.active
                      );

                      if (activeServices.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <TestTube className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                            <div className="space-y-2">
                              <p className="text-gray-600 dark:text-gray-200">{t('no_active_services_title')}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-500">{t('no_active_services_desc')}</p>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {activeServices.map(testType => {
                            const state = serviceStates[testType.id];
                            // Get localized name with fallback
                            const displayName = locale === 'ar' && testType.name_ar ? testType.name_ar : testType.name;
                            return (
                              <div
                                key={testType.id}
                                className="p-4 border rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700"
                              >
                                <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                                  <div className="flex-1">
                                    <div className={`flex items-center gap-2 mb-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                        <TestTube className="w-4 h-4 text-white" />
                                      </div>
                                      <h3 className={`font-medium text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{displayName}</h3>
                                    </div>
                                    <p className="text-xs text-gray-600 dark:text-gray-200 mb-3" dir={isRTL ? 'rtl' : 'ltr'}>
                                      {getLocalizedFieldValue(testType, locale, 'description') || testType.description || t('cd_no_description')}
                                    </p>
                                    <div className="space-y-2">
                                      <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                        <span className="text-gray-500 dark:text-gray-400">{t('duration')}:</span>
                                        <span className="font-medium"><span dir="ltr">{formatLocalizedNumber(testType.default_duration || 30, locale)}</span> {t('minutes_short')}</span>
                                      </div>
                                      <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                        <span className="text-gray-500 dark:text-gray-400">{t('fee')}:</span>
                                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                          {formatLocalizedNumber(parseFloat(state.fee || '0') || 0, locale, { style: 'currency', currency: 'SYP' })}
                                        </span>
                                      </div>
                                      <div className={`flex items-center justify-between text-xs ${isRTL ? 'flex-row-reverse text-right' : ''}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                        <span className="text-gray-500 dark:text-gray-400">{t('category')}:</span>
                                        <Badge variant="secondary" className="text-xs">
                                          {t(`category_${testType.category}`) || testType.category || t('category_general')}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={isRTL ? 'mr-2' : 'ml-2'}>
                                    <Badge variant="default" className="text-xs bg-green-500">
                                      {t('active')}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-emerald-200 dark:border-emerald-700">
                                  <div className={`flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                                    <CheckCircle className="w-3 h-3" />
                                    <span>{t('online_booking_available')}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}>
                      <Activity className="w-5 h-5" />
                      {t('quick_actions')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button
                        variant="outline"
                        className={`flex items-center gap-2 p-4 h-auto ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                        onClick={() => {
                          const activeServices = Object.entries(serviceStates).filter(([_, state]) => state.active);
                          toast({
                            title: t('bulk_enable'),
                            description: `${activeServices.length} ${t('services_enabled')}`
                          });
                        }}
                      >
                        <CheckCircle className={`w-5 h-5 text-green-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="font-medium">{t('enable_all')}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('activate_all_services')}</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className={`flex items-center gap-2 p-4 h-auto ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                        onClick={() => {
                          setServiceStates(prev => {
                            const updated = { ...prev };
                            Object.keys(updated).forEach(key => {
                              updated[key] = { ...updated[key], active: false };
                            });
                            return updated;
                          });
                          toast({
                            title: t('bulk_disable'),
                            description: t('all_services_disabled')
                          });
                        }}
                      >
                        <XCircle className={`w-5 h-5 text-red-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="font-medium">{t('disable_all')}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('deactivate_all_services')}</div>
                        </div>
                      </Button>

                      <Button
                        variant="outline"
                        className={`flex items-center gap-2 p-4 h-auto ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
                        onClick={() => {
                          setServiceStates(prev => {
                            const updated = { ...prev };
                            allTestTypes.forEach((testType: any) => {
                              if (updated[testType.id]) {
                                updated[testType.id] = {
                                  ...updated[testType.id],
                                  fee: testType.default_fee?.toString() || '50'
                                };
                              }
                            });
                            return updated;
                          });
                          toast({
                            title: t('pricing_reset'),
                            description: t('default_prices_applied')
                          });
                        }}
                      >
                        <RotateCcw className={`w-5 h-5 text-blue-500 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <div className="font-medium">{t('reset_pricing')}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{t('restore_default_prices')}</div>
                        </div>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="relative p-6 rounded-2xl glass-effect">
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Settings className="h-5 w-5 text-white" /></div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h2 className={`text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_profile_settings')}</h2>
                      <p className={`text-emerald-700/80 dark:text-emerald-400/80 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_update_center_info')}</p>
                    </div>
                  </div>
                </div>

                {/* Current Profile Overview */}
                {centerProfile && (
                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardHeader>
                      <CardTitle className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <Building2 className="w-5 h-5" />
                          <span dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_current_profile')}</span>
                        </div>
                        {centerProfile && (
                          <div className="flex items-center gap-2">
                            {centerProfile.name && centerProfile.email && centerProfile.phone ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                <CheckCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                {t('complete')}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                <AlertCircle className={`w-3 h-3 ${isRTL ? 'ml-1' : 'mr-1'}`} />
                                {t('incomplete')}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const localizedName = getProfileField('name');
                        const displayName = localizedName || centerProfile.name || t('cd_no_name_set');
                        const localizedAddress = getProfileField('address');
                        const displayAddress = localizedAddress || centerProfile.address || t('cd_not_provided');
                        const localizedDescription = getProfileField('description') || centerProfile.description || '';
                        const initialsSource = (localizedName || centerProfile.name || '').trim();
                        const initials = initialsSource
                          ? initialsSource.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                          : '';
                        const websiteValue = getProfileField('website') || centerProfile.website || '';

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                {initials ? (
                                  <span className="text-white font-medium text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
                                    {initials}
                                  </span>
                                ) : (
                                  <Building2 className="w-5 h-5 text-white" />
                                )}
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="font-medium text-gray-900 dark:text-white" dir={isRTL ? 'rtl' : 'ltr'}>{displayName}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400" dir="ltr">{centerProfile.email || t('cd_no_email_set')}</p>
                              </div>
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <p className={`text-sm text-gray-500 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Phone className="w-3 h-3" />
                                {t('phone')}
                              </p>
                              <p className="font-medium" dir={isRTL ? 'rtl' : 'ltr'}>{centerProfile.phone || t('cd_not_provided')}</p>
                            </div>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <p className={`text-sm text-gray-500 flex items-center gap-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                                <Building2 className="w-3 h-3" />
                                {t('address')}
                              </p>
                              <p className="font-medium" dir={isRTL ? 'rtl' : 'ltr'}>{displayAddress}</p>
                            </div>
                            {(websiteValue || localizedDescription) && (
                              <>
                                {websiteValue && (
                                  <div className={isRTL ? 'text-right' : 'text-left'}>
                                    <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('website')}</p>
                                    <p className="font-medium text-blue-600 hover:text-blue-800" dir="ltr">
                                      <a href={websiteValue} target="_blank" rel="noopener noreferrer">
                                        {websiteValue}
                                      </a>
                                    </p>
                                  </div>
                                )}
                                {localizedDescription && (
                                  <div className={`col-span-full ${isRTL ? 'text-right' : 'text-left'}`}>
                                    <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>{t('description')}</p>
                                    <p className={`font-medium ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                                      {localizedDescription}
                                    </p>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                  <CardHeader>
                    <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                      <Edit className="w-5 h-5" />
                      {t('center_profile')}
                    </CardTitle>
                    <CardDescription className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>
                      {t('cd_update_profile_desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="centerName" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('center_name')} *</Label>
                          <Input
                            id="centerName"
                            placeholder={centerProfile?.name ? `${t('current_prefix')} ${centerProfile.name}` : (t('enter_center_name'))}
                            value={profileForm.name}
                            onChange={(e) => updateProfileForm('name', e.target.value)}
                            className="mt-1"
                            required
                            dir="ltr"
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_name_appears_on')}</p>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="centerNameAr" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_center_name_arabic')}</Label>
                          <Input
                            id="centerNameAr"
                            placeholder={centerProfile?.name_ar ? `${t('current_prefix')} ${centerProfile.name_ar}` : 'أدخل اسم المركز بالعربية'}
                            value={profileForm.name_ar}
                            onChange={(e) => updateProfileForm('name_ar', e.target.value)}
                            className="mt-1"
                            dir="rtl"
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_name_arabic_help')}</p>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="email" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('email')} *</Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder={centerProfile?.email ? `${t('current_prefix')} ${centerProfile.email}` : (user?.email ? `${t('current_prefix')} ${user.email}` : (t('enter_email')))}
                            value={profileForm.email}
                            onChange={(e) => updateProfileForm('email', e.target.value)}
                            className="mt-1"
                            required
                            dir="ltr"
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_primary_contact_email')}</p>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="phone" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('phone')}</Label>
                          <Input
                            id="phone"
                            placeholder={centerProfile?.phone ? `${t('current_prefix')} ${centerProfile.phone}` : (t('enter_phone'))}
                            value={profileForm.phone}
                            onChange={(e) => updateProfileForm('phone', e.target.value)}
                            className="mt-1"
                            dir="ltr"
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_contact_number_appointments')}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="address" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('address')}</Label>
                          <Input
                            id="address"
                            placeholder={centerProfile?.address ? `${t('current_prefix')} ${centerProfile.address}` : (t('enter_address'))}
                            value={profileForm.address}
                            onChange={(e) => updateProfileForm('address', e.target.value)}
                            className="mt-1"
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_physical_location')}</p>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="website" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('website')}</Label>
                          <Input
                            id="website"
                            placeholder={centerProfile?.website ? `${t('current_prefix')} ${centerProfile.website}` : (t('enter_website'))}
                            value={profileForm.website}
                            onChange={(e) => updateProfileForm('website', e.target.value)}
                            className="mt-1"
                            dir="ltr"
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_optional_website')}</p>
                        </div>
                        <div className={isRTL ? 'text-right' : 'text-left'}>
                          <Label htmlFor="description" className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('description')}</Label>
                          <textarea
                            id="description"
                            placeholder={centerProfile?.description ? `${t('current_prefix')} ${centerProfile.description}` : (t('enter_description'))}
                            value={profileForm.description}
                            onChange={(e) => updateProfileForm('description', e.target.value)}
                            className={`mt-1 w-full p-3 border rounded-lg resize-none ${isRTL ? 'text-right' : 'text-left'}`}
                            rows={3}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                          <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_brief_description')}</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <Button
                          onClick={saveProfile}
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          disabled={profileSaving}
                        >
                          <Save className="w-4 h-4" />
                          {profileSaving ? (t('updating_profile')) : (t('save_profile'))}
                        </Button>
                        <Button
                          variant="outline"
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          onClick={() => {
                            if (centerProfile) {
                              setProfileForm({
                                name: centerProfile.name || '',
                                name_ar: centerProfile.name_ar || '',
                                email: centerProfile.email || user?.email || '',
                                phone: centerProfile.phone || '',
                                address: centerProfile.address || '',
                                website: centerProfile.website || '',
                                description: centerProfile.description || ''
                              });
                            }
                          }}
                        >
                          <RotateCcw className="w-4 h-4" />
                          {t('reset_form')}
                        </Button>
                        <Button
                          variant="outline"
                          className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                          onClick={() => setActiveTab('services')}
                        >
                          <TestTube className="w-4 h-4" />
                          {t('manage_services')}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>

      {/* Enhanced Patient Modal */}
      {showPatientModal && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className={`text-xl font-bold text-gray-900 dark:text-white ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                {t('cd_patient_medical_records')}: {getLocalizedNameUtil(selectedPatient, locale, 'name') || t('cd_unknown_patient')}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowPatientModal(false)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Patient Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patient_information')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patient_full_name')}</Label>
                      <Input value={getLocalizedNameUtil(selectedPatient, locale, 'name') || t('cd_unknown_patient')} readOnly dir={isRTL ? 'rtl' : 'ltr'} className={isRTL ? 'text-right' : 'text-left'} />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patient_email')}</Label>
                      <Input value={selectedPatient.email || t('cd_value_not_provided')} readOnly dir="ltr" className="text-left" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patient_phone')}</Label>
                      <Input value={selectedPatient.phone || t('cd_value_not_provided')} readOnly dir="ltr" className="text-left" />
                    </div>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <Label className={isRTL ? 'text-right' : 'text-left'} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_registered_date')}</Label>
                      <Input value={selectedPatient.created_at ? formatLocalizedDate(selectedPatient.created_at, locale) : t('cd_value_not_provided')} readOnly dir="ltr" className="text-left" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Past Lab Tests History with This Center */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_lab_test_history')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPatient.labHistory?.length > 0 ? (
                    <div className="space-y-3">
                      {selectedPatient.labHistory.map((test: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className={isRTL ? 'text-right' : 'text-left'}>
                              <p className="font-medium text-gray-900 dark:text-white" dir={isRTL ? 'rtl' : 'ltr'}>{getLocalizedNameUtil(test.lab_test_types, locale, 'name') || t('cd_unknown_test')}</p>
                              <p className="text-sm text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>
                                <span dir="ltr">{test.booking_date ? formatLocalizedDate(test.booking_date, locale) : t('cd_date_not_available')}</span> • <span dir="ltr">{formatLocalizedNumber(test.fee || 0, locale, { style: 'currency', currency: t('currency') })}</span>
                              </p>
                            </div>
                            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                              <Badge className={`${test.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 border-green-300 dark:border-green-700' :
                                test.status === 'confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-300 dark:border-blue-700' :
                                  test.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700' :
                                    test.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-300 dark:border-red-700' :
                                      'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200 border-gray-300 dark:border-gray-700'
                                }`} dir={isRTL ? 'rtl' : 'ltr'}>
                                {test.status === 'completed' ? (t('appointments_status_completed')) :
                                  test.status === 'confirmed' ? (t('appointments_status_confirmed')) :
                                    test.status === 'scheduled' ? (t('appointments_status_scheduled')) :
                                      test.status === 'cancelled' ? (t('appointments_status_cancelled')) :
                                        test.status}
                              </Badge>
                              {test.result_file_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
                                  onClick={() => window.open(test.result_file_url, '_blank')}
                                >
                                  {t('cd_view_result')}
                                </Button>
                              )}
                            </div>
                          </div>
                          {test.result_notes && (
                            <p className="text-sm text-gray-600 dark:text-gray-200 mt-2" dir={isRTL ? 'rtl' : 'ltr'}>
                              <span className="font-medium">{t('cd_notes')}:</span> {test.result_notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TestTube className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_lab_history')}</p>
                      <p className="text-sm text-gray-400 mt-1" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_tests_yet')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Patient Registration & Medical Information */}
              <Card>
                <CardHeader>
                  <CardTitle className={`text-lg ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patient_registration_info')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedPatient.medicalRecords?.length > 0 ? (
                    <div className="space-y-6">
                      {selectedPatient.medicalRecords.map((record: any, index: number) => (
                        <div key={index} className="space-y-4">
                          {/* Personal Information */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                              <h4 className={`font-medium text-gray-900 dark:text-white mb-3 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_personal_details')}</h4>
                              <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <strong>{t('cd_patient_full_name')}:</strong> {getLocalizedNameUtil(record, locale, 'name') || t('cd_value_not_provided')}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <strong>{t('cd_patient_gender')}:</strong> {record.gender ? (record.gender.toLowerCase() === 'male' ? (t('gender_male')) : record.gender.toLowerCase() === 'female' ? (t('gender_female')) : record.gender) : (t('cd_value_not_provided'))}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <strong>{t('cd_patient_dob')}:</strong> <span dir="ltr">{record.date_of_birth ? formatLocalizedDate(record.date_of_birth, locale) : (t('cd_value_not_provided'))}</span>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <strong>{t('cd_patient_phone')}:</strong> <span dir="ltr">{record.phone || (t('cd_value_not_provided'))}</span>
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  <strong>{t('cd_patient_email')}:</strong> <span dir="ltr">{record.email || (t('cd_value_not_provided'))}</span>
                                </p>
                              </div>
                            </div>

                            {/* Emergency Contact */}
                            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                              <h4 className={`font-medium text-gray-900 dark:text-white mb-3 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_emergency_contact')}</h4>
                              <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {record.emergency_contact && Object.keys(record.emergency_contact).length > 0 ? (
                                  <>
                                    {record.emergency_contact.name && (
                                      <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                        <strong>{t('cd_contact_name')}:</strong> {record.emergency_contact.name}
                                      </p>
                                    )}
                                    {record.emergency_contact.phone && (
                                      <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                        <strong>{t('cd_patient_phone')}:</strong> <span dir="ltr">{record.emergency_contact.phone}</span>
                                      </p>
                                    )}
                                    {record.emergency_contact.relationship && (
                                      <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                        <strong>{t('cd_contact_relationship')}:</strong> {record.emergency_contact.relationship}
                                      </p>
                                    )}
                                    {record.emergency_contact.email && (
                                      <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                        <strong>{t('cd_patient_email')}:</strong> <span dir="ltr">{record.emergency_contact.email}</span>
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_no_emergency_contact')}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Medical History */}
                          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <h4 className={`font-medium text-gray-900 dark:text-white mb-3 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_medical_history')}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_medical_history')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  {record.medical_history || (t('cd_no_medical_history'))}
                                </p>
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_patient_allergies')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  {record.allergies || (t('cd_no_allergies'))}
                                </p>
                              </div>
                              <div className={isRTL ? 'text-right' : 'text-left'}>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_current_medications')}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                  {record.medications || (t('cd_no_medications'))}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Registration Details */}
                          <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <h4 className={`font-medium text-gray-900 dark:text-white mb-3 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>{t('cd_registration_details')}</h4>
                            <div className={`space-y-2 ${isRTL ? 'text-right' : 'text-left'}`} dir={isRTL ? 'rtl' : 'ltr'}>
                              <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                <strong>{t('cd_registered_date')}:</strong> <span dir="ltr">{record.created_at ? formatLocalizedDate(record.created_at, locale) : (t('cd_unknown'))}</span>
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-200" dir={isRTL ? 'rtl' : 'ltr'}>
                                <strong>{t('cd_last_updated_date')}:</strong> <span dir="ltr">{record.updated_at ? formatLocalizedDate(record.updated_at, locale) : (t('cd_not_updated'))}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Heart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-gray-500 dark:text-gray-400">{t('cd_no_patient_registration')}</p>
                      <p className="text-sm text-gray-400 mt-1">{t('cd_registration_details_appear')}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className={`flex ${isRTL ? 'justify-start' : 'justify-end'}`}>
                <Button variant="outline" onClick={() => setShowPatientModal(false)}>{t('cd_close')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Result Modal */}
      {showUploadModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-4">
            <div className={`flex items-center justify-between mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('cd_upload_lab_result')}: {getLocalizedNameUtil(selectedAppointment, locale, 'patient_name')}
              </h3>
              <Button variant="outline" size="sm" onClick={() => setShowUploadModal(false)}>
                <XCircle className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Appointment Details */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
                    <div>
                      <Label>{t('cd_modal_patient_name')}</Label>
                      <Input value={getLocalizedNameUtil(selectedAppointment, locale, 'patient_name')} readOnly />
                    </div>
                    <div>
                      <Label>{t('cd_modal_test_type')}</Label>
                      <Input value={getLocalizedNameUtil(selectedAppointment, locale, 'test_type_name') || selectedAppointment.test_type_name} readOnly />
                    </div>
                    <div>
                      <Label>{t('cd_appointment_date')}</Label>
                      <Input value={selectedAppointment.booking_date ? formatLocalizedDate(selectedAppointment.booking_date, locale) : t('cd_na')} readOnly />
                    </div>
                    <div>
                      <Label>{t('cd_appointment_time')}</Label>
                      <Input value={selectedAppointment.booking_time ? formatLocalizedDate(new Date(`2000-01-01 ${selectedAppointment.booking_time}`), locale, 'time') : t('cd_na')} readOnly />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Upload Section */}
              <div dir={isRTL ? 'rtl' : 'ltr'}>
                <Label>{t('cd_upload_lab_result_pdf')}</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  className="mt-2"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {t('cd_upload_pdf_hint')}
                </p>
              </div>

              <div dir={isRTL ? 'rtl' : 'ltr'}>
                <Label>{t('cd_result_notes_optional')}</Label>
                <textarea
                  className="w-full p-3 border rounded-lg mt-2 resize-none"
                  rows={4}
                  placeholder={t('cd_notes_placeholder')}
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                ></textarea>
              </div>

              <div className={`flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Button
                  onClick={handleFileUpload}
                  disabled={!uploadFile || uploading}
                >
                  {uploading ? t('cd_uploading') : t('cd_modal_upload_result')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                >
                  {t('cd_modal_cancel')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
