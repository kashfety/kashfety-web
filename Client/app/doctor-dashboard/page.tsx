"use client"

import { useState, useEffect } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import {
  Calendar,
  Users,
  Clock,
  DollarSign,
  Activity,
  TrendingUp,
  User,
  Phone,
  Mail,
  MapPin,
  Star,
  Plus,
  Edit,
  Bell,
  Settings,
  Menu,
  Home,
  BarChart2,
  Building2,
  Folder,
  Wallet,
  Receipt,
  CreditCard,
  Users2,
  Shield,
  MessagesSquare,
  Video,
  HelpCircle,
  ChevronRight,
  Stethoscope,
  FileText,
  CalendarDays,
  UserCheck,
  Heart,
  Thermometer,
  Award,
  AlertCircle,
  CheckCircle,
  XCircle,
  Zap,
  Grid3X3
} from "lucide-react";
import ScheduleChart from "@/components/dashboard/schedule-chart";
import AppointmentsChart from "@/components/dashboard/appointments-chart";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";
import { useLocale } from "@/components/providers/locale-provider";
import { localizeDoctorName, localizeSpecialty } from "@/lib/i18n";

// Import dashboard components
import FirstTimeDoctorSetup from "@/components/FirstTimeDoctorSetup";
import DoctorProfileSettings from "@/components/DoctorProfileSettings";
import DoctorScheduleManagement from "@/components/DoctorScheduleManagement";
import DoctorCenterManagement from "@/components/DoctorCenterManagement";
import DoctorScheduleCalendar from "@/components/DoctorScheduleCalendar";
import AppointmentDetailsModal from "@/components/AppointmentDetailsModal";

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  specialty?: string;
  experience_years?: number;
  consultation_fee?: number;
  bio?: string;
  phone?: string;
  address?: string;
  qualifications?: string[];
}

interface TodayStats {
  stats: {
    todayAppointments: number;
    todayCompleted: number;
    todayRevenue: number;
    nextAppointment?: {
      patient_name: string;
      time: string;
      date?: string;
      type: string;
    };
  };
  appointments: Appointment[];
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  totalAppointments?: number;
  lastAppointment?: string;
  created_at?: string;
}

interface Analytics {
  analytics: {
    totalPatients: number;
    thisMonthAppointments: number;
    completionRate: number;
    avgRating: number;
    totalRevenue: number;
    patientDemographics: {
      ageGroups: Record<string, number>;
      genderDistribution: Record<string, number>;
      appointmentTypes: Record<string, number>;
    };
  };
  billing?: {
    monthlyRevenue: number;
    monthlyGrowth: number;
  };
}

interface Appointment {
  id: string;
  patient_name: string;
  patient_id: string;
  patient_phone?: string;
  patient_email?: string;
  appointment_time: string;
  appointment_date: string;
  type: string;
  appointment_type: string;
  status: string;
  symptoms?: string;
  chief_complaint?: string;
  consultation_fee?: number;
  notes?: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  cancellation_reason?: string;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface PatientDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  gender?: string;
  date_of_birth?: string;
  medical_history?: string;
  allergies?: string;
  medications?: string;
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };
  totalAppointments?: number;
  lastAppointment?: string;
  created_at?: string;
  medicalRecords?: MedicalRecord[];
  appointmentHistory?: Appointment[];
}

// Sidebar Component
function Sidebar({
  activeTab,
  setActiveTab,
  toast
}: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  toast: any;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { theme } = useTheme();
  const { t } = useLocale();

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
        className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-left ${isActive
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
          } ${isCollapsed ? 'justify-center' : ''}`}
        title={isCollapsed ? children?.toString() : ''}
      >
        <Icon className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
        {!isCollapsed && <span className="ml-3">{children}</span>}
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23] transition-all duration-300 hover:scale-110 hover:translate-y-[-2px] hover:shadow-lg"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      <nav
        className={`
          fixed inset-y-0 left-0 z-[70] bg-white dark:bg-[#0F0F12] transform transition-all duration-300 ease-in-out
          lg:translate-x-0 lg:static border-r border-gray-200 dark:border-[#1F1F23]
          ${isCollapsed ? 'lg:w-16 sidebar-collapsed' : 'lg:w-64'}
          ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className={`h-16 flex items-center justify-between border-b border-gray-200 dark:border-[#1F1F23] ${isCollapsed ? 'px-2' : 'px-6'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              {!isCollapsed && (
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('dd_portal') || 'Doctor Portal'}
                </span>
              )}
            </div>

            {/* Collapse Button - Desktop Only */}
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors"
                title={t('dd_collapse_sidebar') || "Collapse sidebar"}
              >
                <Menu className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
            )}

            {/* Expand Button when Collapsed */}
            {isCollapsed && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-1.5 hover:bg-gray-100 dark:hover:bg-[#1F1F23] rounded-lg transition-colors absolute top-4 right-2"
                title={t('dd_expand_sidebar') || "Expand sidebar"}
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
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('dd_dashboard') || 'Dashboard'}
                  </div>
                )}
                <div className={isCollapsed ? 'space-y-2' : ''}>
                  <NavItem tab="overview" icon={Home} isActive={activeTab === "overview"}>
                    {t('dd_overview_tab') || 'Overview'}
                  </NavItem>
                  <NavItem tab="appointments" icon={Calendar} isActive={activeTab === "appointments"}>
                    {t('dd_appointments_tab') || 'Appointments'}
                  </NavItem>
                  <NavItem tab="schedule-calendar" icon={Grid3X3} isActive={activeTab === "schedule-calendar"}>
                    {t('dd_schedule_calendar_tab') || 'Schedule Calendar'}
                  </NavItem>
                  <NavItem tab="patients" icon={Users} isActive={activeTab === "patients"}>
                    {t('dd_patients_tab') || 'Patients'}
                  </NavItem>
                  <NavItem tab="analytics" icon={BarChart2} isActive={activeTab === "analytics"}>
                    {t('dd_analytics_tab') || t('analytics') || 'Analytics'}
                  </NavItem>
                  <NavItem tab="reviews" icon={Star} isActive={activeTab === "reviews"}>
                    {t('dd_reviews_tab') || 'Reviews'}
                  </NavItem>
                </div>
              </div>

              <div>
                {!isCollapsed && (
                  <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    {t('dd_management_section') || 'Management'}
                  </div>
                )}
                <div className={isCollapsed ? 'space-y-2' : ''}>
                  <NavItem tab="schedule" icon={Clock} isActive={activeTab === "schedule"}>
                    {t('dd_schedule_tab') || 'Schedule'}
                  </NavItem>
                  <NavItem tab="centers" icon={Building2} isActive={activeTab === "centers"}>
                    {t('dd_centers_tab') || 'Centers'}
                  </NavItem>
                  <NavItem tab="profile" icon={Settings} isActive={activeTab === "profile"}>
                    {t('dd_profile_tab') || 'Profile'}
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className={`py-4 border-t border-gray-200 dark:border-[#1F1F23] ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <div>
              <button
                onClick={() => window.open('mailto:support@doctorapp.com', '_blank')}
                className={`w-full flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23] ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? (t('dd_help_support') || 'Help & Support') : ''}
              >
                <HelpCircle className={`h-4 w-4 flex-shrink-0 ${isCollapsed ? '' : 'mr-3'}`} />
                {!isCollapsed && <span className="ml-3">{t('dd_help_support') || 'Help & Support'}</span>}
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

// Profile Header Component (simplified - no nav bar, just profile controls)
function ProfileHeader({
  doctorProfile,
  setActiveTab,
  toast
}: {
  doctorProfile: DoctorProfile | null;
  setActiveTab: (tab: string) => void;
  toast: any;
}) {
  const { t, locale } = useLocale();
  const { logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="relative px-6 flex items-center justify-end gap-4 bg-white dark:bg-[#0F0F12] h-full">
      <LocaleSwitcher />
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {localizeDoctorName(locale, doctorProfile?.name || 'Doctor')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {localizeSpecialty(locale, doctorProfile?.specialty || 'General Medicine')}
              </div>
            </div>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          sideOffset={8}
          className="w-64 bg-background border-border rounded-lg shadow-lg"
        >
          <div className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {localizeDoctorName(locale, doctorProfile?.name || 'Doctor')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {doctorProfile?.email || ''}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                size="sm"
                onClick={() => {
                  setActiveTab("profile");
                  toast({
                    title: t('dd_profile_tab') || 'Profile',
                    description: t('opening_profile_settings') || 'Opening profile settings...',
                  });
                }}
              >
                <Settings className="w-4 h-4 mr-2" />
                {t('dd_profile_tab') || 'Profile'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                size="sm"
                onClick={handleLogout}
              >
                <User className="w-4 h-4 mr-2" />
                {t('header_logout') || 'Logout'}
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {/* Emerald glow behind user controls */}
      <div className="pointer-events-none absolute -top-8 -right-8 w-48 h-48 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full blur-3xl" />
    </div>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, locale } = useLocale();

  // States
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Pagination states
  const [showAllAppointments, setShowAllAppointments] = useState(false);
  const [showAllPatients, setShowAllPatients] = useState(false);

  // Patient Medical Records Modal States
  const [selectedPatient, setSelectedPatient] = useState<PatientDetails | null>(null);
  const [showPatientModal, setShowPatientModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showMedicalRecordForm, setShowMedicalRecordForm] = useState(false);
  const [medicalRecordForm, setMedicalRecordForm] = useState({
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: ''
  });
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedAppointmentForDetails, setSelectedAppointmentForDetails] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    console.log('Current user role:', user?.role);
    if (!user) {
      router.push('/login');
      return;
    }

    // Support deep linking via sidebar like /doctor-dashboard?tab=appointments (initial mount)
    try {
      const url = new URL(window.location.href);
      const initialTab = url.searchParams.get('tab');
      if (initialTab && ['overview', 'appointments', 'patients', 'schedule', 'centers', 'profile', 'analytics', 'reviews'].includes(initialTab)) {
        setActiveTab(initialTab);
      }
    } catch { }

    fetchDoctorData();
  }, [router]);

  // React to query param changes without full remount (e.g., FAB switching tabs)
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'appointments', 'patients', 'schedule', 'centers', 'profile', 'analytics', 'reviews'].includes(tab) && tab !== activeTab) {
      setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Fetch reviews when reviews tab is active
  useEffect(() => {
    const fetchReviews = async () => {
      if (activeTab !== 'reviews') return;

      setReviewsLoading(true);
      try {
        const storedUserStr = localStorage.getItem('auth_user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
        const doctorId = user?.id || storedUser?.id;

        if (!doctorId) {
          console.error('Doctor ID not found');
          setReviewsLoading(false);
          return;
        }

        const response = await fetch(`/api/doctor-reviews?doctor_id=${encodeURIComponent(doctorId)}`);

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Reviews fetched:', data.reviews?.length || 0);
          setReviews(data.reviews || []);
        } else {
          console.error('Failed to fetch reviews:', response.status);
          setReviews([]);
        }
      } catch (error) {
        console.error('Error fetching reviews:', error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [activeTab, user?.id]);

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');

      if (!token) {
        console.error('No token found in localStorage');
        router.push('/login');
        return;
      }

      // Derive doctorId from auth context or localStorage fallback
      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = user?.id || storedUser?.id;
      const doctorIdQuery = doctorId ? `doctor_id=${encodeURIComponent(doctorId)}` : '';
      const withDoctorId = (base: string) => doctorIdQuery ? `${base}?${doctorIdQuery}` : base;

      console.log('Fetching doctor data with token:', token ? 'present' : 'missing');

      // Fetch doctor profile
      const profileResponse = await fetch(withDoctorId('/api/doctor-dashboard/profile'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile response status:', profileResponse.status);

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        console.log('Profile data received:', profileData);
        setDoctorProfile(profileData.doctor);

        // Check if this is first time setup (no specialty set)
        if (!profileData.doctor.specialty) {
          setIsFirstTimeSetup(true);
          setLoading(false);
          return;
        }
      } else {
        const errorText = await profileResponse.text();
        console.error('Profile fetch error:', profileResponse.status, errorText);
        if (profileResponse.status === 401) {
          router.push('/login');
          return;
        }
      }

      // Fetch all dashboard data in parallel with error handling
      const fetchPromises = [
        fetch(withDoctorId('/api/doctor-dashboard/today-stats'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),

        fetch(withDoctorId('/api/doctor-dashboard/patients'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),

        fetch(withDoctorId('/api/doctor-dashboard/analytics'), {
          headers: { 'Authorization': `Bearer ${token}` }
        }),

        fetch(`/api/doctor-dashboard/appointments?limit=50${doctorId ? `&${doctorIdQuery}` : ''}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ];

      const [todayResponse, patientsResponse, analyticsResponse, appointmentsResponse] = await Promise.all(fetchPromises);

      // Handle today stats
      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        setTodayStats(todayData);
      } else {
        console.warn('Today stats fetch failed');
        setTodayStats({
          stats: {
            todayAppointments: 0,
            todayCompleted: 0,
            todayRevenue: 0
          },
          appointments: []
        });
      }

      // Handle patients data
      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        setPatients(patientsData.patients || []);
      } else {
        console.warn('Patients fetch failed');
        setPatients([]);
      }

      // Handle analytics data
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      } else {
        console.warn('Analytics fetch failed');
        setAnalytics({
          analytics: {
            totalPatients: 0,
            thisMonthAppointments: 0,
            completionRate: 0,
            avgRating: 0,
            totalRevenue: 0,
            patientDemographics: {
              ageGroups: {},
              genderDistribution: {},
              appointmentTypes: {}
            }
          }
        });
      }

      // Handle all appointments data
      if (appointmentsResponse.ok) {
        const appointmentsData = await appointmentsResponse.json();
        setAllAppointments(appointmentsData.appointments || []);
      } else {
        console.warn('Appointments fetch failed');
        setAllAppointments([]);
      }

    } catch (error) {
      console.error('Failed to fetch doctor data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced patient view handler
  const handleViewPatient = async (patientId: string) => {
    try {
      console.log('👤 Fetching patient details for:', patientId);

      // Fetch detailed patient information using fallback routes for Vercel compatibility
      // Filter appointments by current doctor only
      const [patientResponse, medicalRecordsResponse, appointmentsResponse] = await Promise.all([
        fetch(`/api/doctor-patient-details?patientId=${patientId}`).catch(() => fetch(`/api/doctor-dashboard/patients/${patientId}`)),
        fetch(`/api/doctor-patient-medical-records?patientId=${patientId}`).catch(() => fetch(`/api/doctor-dashboard/patients/${patientId}/medical-records`)),
        fetch(`/api/doctor-patient-appointments?patientId=${patientId}${doctorProfile?.id ? `&doctorId=${doctorProfile.id}` : ''}`).catch(() => fetch(`/api/doctor-dashboard/patients/${patientId}/appointments${doctorProfile?.id ? `?doctorId=${doctorProfile.id}` : ''}`))
      ]);

      if (patientResponse.ok) {
        const patientData = await patientResponse.json();
        const medicalRecords = medicalRecordsResponse.ok ? await medicalRecordsResponse.json() : { records: [] };
        const appointments = appointmentsResponse.ok ? await appointmentsResponse.json() : { appointments: [] };

        console.log('✅ Patient data loaded:', {
          patient: patientData.patient?.name,
          medicalRecords: medicalRecords.records?.length || 0,
          appointments: appointments.appointments?.length || 0
        });

        // Calculate age from date_of_birth if available
        const calculateAge = (dateOfBirth: string) => {
          if (!dateOfBirth) return undefined;
          const today = new Date();
          const birthDate = new Date(dateOfBirth);
          let age = today.getFullYear() - birthDate.getFullYear();
          const monthDiff = today.getMonth() - birthDate.getMonth();
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          return age;
        };

        setSelectedPatient({
          ...patientData.patient,
          age: calculateAge(patientData.patient.date_of_birth),
          medicalRecords: medicalRecords.records || [],
          appointmentHistory: appointments.appointments || []
        });
        setShowPatientModal(true);
      } else {
        toast({
          title: "Error",
          description: "Failed to load patient details",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load patient details",
        variant: "destructive",
      });
    }
  };

  // Medical record management
  const handleStartConsultation = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setMedicalRecordForm({
      diagnosis: '',
      treatment: '',
      prescription: '',
      notes: appointment.symptoms || ''
    });
    setShowMedicalRecordForm(true);
  };

  const handleSaveMedicalRecord = async () => {
    if (!selectedAppointment) return;

    try {
      console.log('💾 Saving medical record for appointment:', selectedAppointment.id);

      // Save medical record using Next.js API route
      const response = await fetch('/api/doctor-dashboard/medical-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          patient_id: selectedAppointment.patient_id,
          appointment_id: selectedAppointment.id,
          diagnosis: medicalRecordForm.diagnosis,
          treatment: medicalRecordForm.treatment,
          prescription: medicalRecordForm.prescription,
          notes: medicalRecordForm.notes
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Medical record saved successfully:', result);

        // Update appointment status to completed
        await handleUpdateAppointmentStatus(selectedAppointment.id, 'completed');

        toast({
          title: "Success",
          description: "Medical record saved and appointment completed",
        });

        setShowMedicalRecordForm(false);
        setSelectedAppointment(null);
        setMedicalRecordForm({ diagnosis: '', treatment: '', prescription: '', notes: '' });
        fetchDoctorData();
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to save medical record:', errorData);

        toast({
          title: "Error",
          description: errorData.error || "Failed to save medical record",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save medical record",
        variant: "destructive",
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');

      // Try fallback route first for Vercel compatibility
      let response;
      try {
        console.log('📅 Trying appointment-cancel fallback route');
        response = await fetch(`/api/appointment-cancel?appointmentId=${selectedAppointment.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: cancelReason || 'Cancelled by doctor'
          })
        });
      } catch (fallbackError) {
        console.log('❌ Fallback failed, trying dynamic route');
        response = await fetch(`/api/auth/appointments/${selectedAppointment.id}/cancel`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reason: cancelReason || 'Cancelled by doctor'
          })
        });
      }

      if (response.ok) {
        toast({
          title: "Success",
          description: "Appointment cancelled successfully",
        });

        setShowCancelModal(false);
        setSelectedAppointment(null);
        setCancelReason('');
        fetchDoctorData(); // Refresh dashboard data
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to cancel appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast({
        title: "Error",
        description: "Failed to cancel appointment",
        variant: "destructive",
      });
    }
  };

  const handleUpdateAppointmentStatus = async (appointmentId: string, status: string) => {
    try {
      const storedUserStr = localStorage.getItem('auth_user');
      const storedUser = storedUserStr ? JSON.parse(storedUserStr) : null;
      const doctorId = user?.id || storedUser?.id;

      if (!doctorId) {
        toast({
          title: "Error",
          description: "Doctor ID not found",
          variant: "destructive",
        });
        return;
      }

      // Use the fallback route directly (works on Vercel)
      console.log('🔄 Updating appointment status via fallback route:', { appointmentId, doctorId, status });
      const response = await fetch(`/api/doctor-update-appointment-status?appointmentId=${encodeURIComponent(appointmentId)}&doctor_id=${encodeURIComponent(doctorId)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, doctor_id: doctorId })
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Appointment status updated successfully');
        toast({
          title: "Success",
          description: `Appointment status updated to ${status}`,
        });
        // Refresh data to show updated status on both doctor and patient sides
        fetchDoctorData();
      } else {
        console.error('❌ Failed to update appointment status:', result);
        toast({
          title: "Error",
          description: result.message || result.error || "Failed to update appointment status",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
      toast({
        title: "Error",
        description: "Failed to update appointment status",
        variant: "destructive",
      });
    }
  };

  const handleBookAppointment = (patientId?: string) => {
    if (patientId) {
      toast({
        title: t('dd_book_appointment_title') || "Book Appointment",
        description: t('dd_opening_booking_for_patient') || `Opening appointment booking for patient...`,
      });
      // Navigate to appointment booking with patient pre-selected
      setActiveTab("schedule");
    } else {
      toast({
        title: t('dd_book_appointment_title') || "Book Appointment",
        description: t('dd_opening_booking_form') || "Opening appointment booking form...",
      });
      setActiveTab("schedule");
    }
  };

  const handleViewAllPatients = () => {
    setShowAllPatients(true);
    setActiveTab("patients");
  };

  const handleViewAllAppointments = () => {
    setShowAllAppointments(true);
    setActiveTab("appointments");
  };

  if (!mounted) {
    return null;
  }

  if (isFirstTimeSetup) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F12] flex items-center justify-center">
        <FirstTimeDoctorSetup
          onSetupComplete={() => {
            setIsFirstTimeSetup(false);
            fetchDoctorData();
          }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#0F0F12] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20 ${theme === "dark" ? "dark" : ""}`}>
      {/* Background mesh to match old dashboard UI */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full blur-3xl animate-float-slow"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-500/20 to-emerald-300/20 rounded-full blur-3xl animate-float-slow" style={{ animationDelay: '10s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-400/5 to-transparent rounded-full animate-breathe"></div>
      </div>

      <div className="flex h-screen relative z-10">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} toast={toast} />

        <div className="w-full flex flex-1 flex-col">
          <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23]">
            <ProfileHeader
              doctorProfile={doctorProfile}
              setActiveTab={setActiveTab}
              toast={toast}
            />
          </header>

          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-[#0F0F12]">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 space-y-6 h-full">
                {/* Welcome Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {t('dd_welcome_back') || 'Welcome back'}, {localizeDoctorName(t ? (t as any).locale || 'en' : 'en', doctorProfile?.name || 'Doctor')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {t('dd_whats_happening') || "Here's what's happening in your practice today"}
                    </p>
                    {todayStats?.stats?.nextAppointment && (
                      <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-300">
                          <span className="font-medium">{t('dd_next_appointment') || 'Next appointment'}:</span> {todayStats.stats.nextAppointment.patient_name}
                          {` ${t('at') || 'at'} `}{todayStats.stats.nextAppointment.time}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 sm:mt-0 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        fetchDoctorData();
                        toast({
                          title: t('dd_refresh') || 'Refresh',
                          description: t('updated') || 'Dashboard data has been updated',
                        });
                      }}
                    >
                      <Activity className="w-4 h-4 mr-2" />
                      {t('dd_refresh') || 'Refresh'}
                    </Button>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_todays_appointments') || "Today's Appointments"}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {todayStats?.stats?.todayAppointments || 0}
                          </p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <span className="text-green-600 dark:text-green-400 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {(() => {
                            const today = todayStats?.stats?.todayAppointments || 0;
                            return today > 0 ? '+' + Math.round(today * 10) + '%' : '0%';
                          })()}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">{t('dd_from_yesterday') || 'from yesterday'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_total_patients') || 'Total Patients'}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analytics?.analytics?.totalPatients || 0}
                          </p>
                        </div>
                        <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <span className="text-green-600 dark:text-green-400 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {(() => {
                            const thisMonth = analytics?.analytics?.thisMonthAppointments || 0;
                            return thisMonth > 0 ? '+' + Math.round(thisMonth * 2) + '%' : '0%';
                          })()}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">{t('dd_this_month') || 'this month'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_monthly_revenue') || 'Monthly Revenue'}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            ${analytics?.analytics?.totalRevenue?.toLocaleString() || '0'}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center text-sm">
                        <span className="text-green-600 dark:text-green-400 flex items-center">
                          <TrendingUp className="w-4 h-4 mr-1" />
                          {(() => {
                            const revenue = analytics?.analytics?.totalRevenue || 0;
                            return revenue > 0 ? '+' + Math.round(revenue / 100) + '%' : '0%';
                          })()}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 ml-2">{t('vsLastWeek') || 'from last month'}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_average_rating') || 'Average Rating'}</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {analytics?.analytics?.avgRating?.toFixed(2) || '0.00'}★
                          </p>
                        </div>
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Progress value={(analytics?.analytics?.avgRating || 0) * 20} className="h-2" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Emerald Hero and Live Status like new UI */}
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-emerald-50 dark:from-emerald-950/30 dark:via-transparent dark:to-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow">
                      <Stethoscope className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-emerald-800 dark:text-emerald-300">Doctor Professional Dashboard</h3>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_practice_overview') || "Here's your comprehensive practice overview for today"}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                    <Zap className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-800 dark:text-emerald-300">
                      {(() => {
                        const total = todayStats?.appointments?.filter(a => ['scheduled', 'confirmed'].includes((a.status || '').toLowerCase())).length || 0
                        // compute minutes to next appointment
                        const upcoming = (todayStats?.appointments || []).slice().sort((a: any, b: any) => {
                          const da = new Date(`${a.appointment_date}T${(a.appointment_time || '00:00')}:00`)
                          const db = new Date(`${b.appointment_date}T${(b.appointment_time || '00:00')}:00`)
                          return da.getTime() - db.getTime()
                        })
                        const now = new Date()
                        const next = upcoming.find((a: any) => new Date(`${a.appointment_date}T${(a.appointment_time || '00:00')}:00`) >= now)
                        let minutes = 0
                        if (next) {
                          const nextDate = new Date(`${next.appointment_date}T${(next.appointment_time || '00:00')}:00`)
                          minutes = Math.max(0, Math.round((nextDate.getTime() - now.getTime()) / 60000))
                        }
                        return `${t('dd_you_have') || 'You have'} ${total} ${t('dd_upcoming_appointments') || 'upcoming appointments'} • ${t('dd_next_patient_in') || 'Next patient in'} ${minutes || 0} ${t('dd_minutes') || 'minutes'}`
                      })()}
                    </span>
                  </div>
                  <div className="absolute -top-8 -right-8 w-48 h-48 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
                </div>

                {/* Charts Grid to match green style */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="hover-lift">
                    {(() => {
                      const appts = (todayStats?.appointments || []) as any[]
                      const counts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
                      const fmt = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
                      appts.forEach(a => { const dt = new Date(`${a.appointment_date}T00:00:00`); counts[fmt(dt)] = (counts[fmt(dt)] || 0) + 1 })
                      const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      const series = order.map(name => ({ name, patients: counts[name] || 0 }))
                      return <ScheduleChart data={series} />
                    })()}
                  </div>
                  <div className="hover-lift">
                    {(() => {
                      // Build monthly series from DB appointments - same logic as analytics tab
                      const byMonthTotal: Record<string, number> = {}
                      const byMonthCompleted: Record<string, number> = {}
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        ; (allAppointments || []).forEach((apt: any) => {
                          const d = new Date(apt.appointment_date)
                          const key = months[d.getMonth()]
                          byMonthTotal[key] = (byMonthTotal[key] || 0) + 1
                          if ((apt.status || '').toLowerCase() === 'completed') byMonthCompleted[key] = (byMonthCompleted[key] || 0) + 1
                        })
                      // Show last 7 months (including current)
                      const now = new Date()
                      const order: string[] = []
                      for (let i = 6; i >= 0; i--) { const m = new Date(now.getFullYear(), now.getMonth() - i, 1); order.push(months[m.getMonth()]) }
                      const data = order.map((m) => ({ name: m, appointments: byMonthTotal[m] || 0, consultations: byMonthCompleted[m] || 0 }))
                      return <AppointmentsChart data={data} />
                    })()}
                  </div>
                </div>

                {/* Floating Calendar FAB with real count (same tab-switching logic) */}
                <div className="fixed bottom-8 right-8 z-50">
                  <button
                    onClick={() => {
                      setActiveTab("appointments");
                      router.replace(`${pathname}?tab=appointments`, { scroll: false });
                    }}
                    className="group relative w-16 h-16 gradient-emerald text-white rounded-2xl shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover-lift animate-float"
                  >
                    <Calendar className="h-6 w-6 mx-auto group-hover:scale-110 transition-transform duration-300" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center animate-breathe">
                      {todayStats?.stats?.todayAppointments || 0}
                    </div>
                    <div className="absolute inset-0 rounded-2xl bg-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                  </button>
                </div>

                {/* Recent Patients */}
                <div className="grid grid-cols-1 gap-6">
                  <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23]">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                        {t('dd_recent_patients') || 'Recent Patients'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {patients.length > 0 ? (
                        patients.slice(0, 5).map((patient) => (
                          <div key={patient.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F1F23] rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {patient.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {patient.lastAppointment ? `${t('last_visit') || 'Last visit'}: ${patient.lastAppointment}` : (t('no_recent_visit') || 'No recent visit')}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                  {patient.totalAppointments || 0} {t('dd_appointments_word') || 'appointments'} • {patient.phone}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  handleViewPatient(patient.id);
                                  setActiveTab("patients");
                                }}
                              >
                                {t('dd_view') || 'View'}
                              </Button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <UserCheck className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">No patients yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Analytics Tab (in-place, same route) */}
              <TabsContent value="analytics" className="p-6 h-full space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl gradient-emerald">
                    <BarChart2 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Analytics</h1>
                    <p className="text-emerald-600/80 dark:text-emerald-400/80">Insights and performance metrics for your medical practice</p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <Card className="bg-white dark:bg-[#0F0F12] border border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Patient Satisfaction</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{(analytics?.analytics?.avgRating || 0).toFixed(2)}/5</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-[#0F0F12] border border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.analytics?.completionRate || 0}%</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-[#0F0F12] border border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{t('dd_this_month') || 'This Month'}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{analytics?.analytics?.thisMonthAppointments || 0} {t('dd_appts') || 'appts'}</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-white dark:bg-[#0F0F12] border border-emerald-200 dark:border-emerald-800">
                    <CardContent className="p-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Revenue</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">${analytics?.analytics?.totalRevenue?.toLocaleString() || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="hover-lift">
                    {(() => {
                      const appts = (todayStats?.appointments || []) as any[]
                      const counts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
                      const fmt = (d: Date) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
                      appts.forEach(a => { const dt = new Date(`${a.appointment_date}T00:00:00`); counts[fmt(dt)] = (counts[fmt(dt)] || 0) + 1 })
                      const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      const series = order.map(name => ({ name, patients: counts[name] || 0 }))
                      return <ScheduleChart data={series} />
                    })()}
                  </div>
                  <div className="hover-lift">
                    {(() => {
                      // Build monthly series from DB appointments
                      const byMonthTotal: Record<string, number> = {}
                      const byMonthCompleted: Record<string, number> = {}
                      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                        ; (allAppointments || []).forEach((apt: any) => {
                          const d = new Date(apt.appointment_date)
                          const key = months[d.getMonth()]
                          byMonthTotal[key] = (byMonthTotal[key] || 0) + 1
                          if ((apt.status || '').toLowerCase() === 'completed') byMonthCompleted[key] = (byMonthCompleted[key] || 0) + 1
                        })
                      // Show last 7 months (including current)
                      const now = new Date()
                      const order: string[] = []
                      for (let i = 6; i >= 0; i--) { const m = new Date(now.getFullYear(), now.getMonth() - i, 1); order.push(months[m.getMonth()]) }
                      const data = order.map((m) => ({ name: m, appointments: byMonthTotal[m] || 0, consultations: byMonthCompleted[m] || 0 }))
                      return <AppointmentsChart data={data} />
                    })()}
                  </div>
                </div>

                {/* Demographics */}
                <Card className="bg-white dark:bg-[#0F0F12] border border-emerald-200 dark:border-emerald-800">
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Patient Demographics</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-gray-400">Breakdown of your patient population</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <p className="font-medium mb-2">Age Distribution</p>
                        {(() => {
                          // Derive age groups from patients (DB)
                          const ageGroups: Record<string, number> = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 }
                          const calcAge = (dob?: string) => {
                            if (!dob) return undefined; const b = new Date(dob); const t = new Date(); let age = t.getFullYear() - b.getFullYear(); const md = t.getMonth() - b.getMonth(); if (md < 0 || (md === 0 && t.getDate() < b.getDate())) age--; return age
                          }
                            ; (patients || []).forEach((p: any) => { const age = calcAge(p.date_of_birth); if (typeof age === 'number') { if (age <= 18) ageGroups['0-18']++; else if (age <= 35) ageGroups['19-35']++; else if (age <= 50) ageGroups['36-50']++; else if (age <= 65) ageGroups['51-65']++; else ageGroups['65+']++; } })
                          const total = Math.max(1, Object.values(ageGroups).reduce((a, b) => a + b, 0))
                          const order = ["0-18", "19-35", "36-50", "51-65", "65+"]
                          return order.map(k => (
                            <div key={k} className="flex justify-between text-sm">
                              <span>{k === '0-18' ? 'Under 18' : k === '65+' ? 'Over 65' : k}</span>
                              <span>{Math.round(((ageGroups[k] || 0) / total) * 100)}%</span>
                            </div>
                          ))
                        })()}
                      </div>
                      <div>
                        <p className="font-medium mb-2">Gender</p>
                        {(() => {
                          const g: Record<string, number> = { female: 0, male: 0, other: 0 }
                            ; (patients || []).forEach((p: any) => { const gender = (p.gender || '').toLowerCase(); if (g[gender] === undefined) g.other++; else g[gender]++ })
                          const total = Math.max(1, Object.values(g).reduce((a, b) => a + b, 0))
                          const rows = [{ label: 'Female', key: 'female' }, { label: 'Male', key: 'male' }, { label: 'Other', key: 'other' }]
                          return rows.map(r => (
                            <div key={r.key} className="flex justify-between text-sm">
                              <span>{r.label}</span>
                              <span>{Math.round(((g[r.key] || 0) / total) * 100)}%</span>
                            </div>
                          ))
                        })()}
                      </div>
                      <div>
                        <p className="font-medium mb-2">Appointment Types</p>
                        {(() => {
                          const tps: Record<string, number> = { clinic: 0, home: 0, telemedicine: 0 }
                            ; (allAppointments || []).forEach((a: any) => { const k = (a.appointment_type || a.type || 'clinic').toString().toLowerCase(); if (tps[k] === undefined) tps.clinic++; else tps[k]++ })
                          const total = Math.max(1, Object.values(tps).reduce((a, b) => a + b, 0))
                          const rows = [{ label: 'Clinic', key: 'clinic' }, { label: 'Home', key: 'home' }, { label: 'Telemedicine', key: 'telemedicine' }]
                          return rows.map(r => (
                            <div key={r.key} className="flex justify-between text-sm">
                              <span>{r.label}</span>
                              <span>{Math.round(((tps[r.key] || 0) / total) * 100)}%</span>
                            </div>
                          ))
                        })()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* Appointments Tab */}
              <TabsContent value="appointments" className="p-6 h-full">
                {/* Hero like old dashboard */}
                <div className="relative p-6 rounded-2xl glass-effect mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Calendar className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">{t('dd_upcoming_appointments_title') || 'Upcoming Appointments'}</h2>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_manage_consultations') || 'Manage today and upcoming consultations'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 scroll-animation" data-animation="slide-in-up">
                  {/* Today's and Upcoming Appointments */}
                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {t('dd_upcoming_schedule') || 'Upcoming Appointments'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {allAppointments && allAppointments.length > 0 ? (
                        <div className="space-y-4">
                          {(showAllAppointments ? allAppointments : allAppointments.slice(0, 10)).map((appointment) => (
                            <div
                              key={appointment.id}
                              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1A1A1E] hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                  <User className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {appointment.patient_name}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(appointment.appointment_date).toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })} {t('at') || 'at'} {(() => { try { const [h, m] = (appointment.appointment_time || '').split(':'); const dt = new Date(); dt.setHours(parseInt(h), parseInt(m), 0); return dt.toLocaleTimeString(locale || 'en-US', { hour: 'numeric', minute: '2-digit', hour12: locale !== 'ar' }); } catch { return appointment.appointment_time; } })()}
                                  </p>
                                  <p className="text-sm text-gray-500 dark:text-gray-500">
                                    {localizeSpecialty(locale, appointment.appointment_type || 'Clinic')}
                                  </p>
                                  {appointment.symptoms && (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                                      {t('symptoms') || 'Symptoms'}: {appointment.symptoms}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={
                                    appointment.status === 'completed'
                                      ? 'default'
                                      : appointment.status === 'confirmed'
                                        ? 'secondary'
                                        : appointment.status === 'scheduled'
                                          ? 'outline'
                                          : 'destructive'
                                  }
                                  className={
                                    appointment.status === 'completed'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                      : appointment.status === 'confirmed'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                        : appointment.status === 'scheduled'
                                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                          : ''
                                  }
                                >
                                  {(() => { const s = (appointment.status || '').toLowerCase(); if (s === 'scheduled') return t('appointments_status_scheduled') || 'Scheduled'; if (s === 'confirmed') return t('appointments_status_confirmed') || 'Confirmed'; if (s === 'completed') return t('appointments_status_completed') || 'Completed'; if (s === 'cancelled') return t('appointments_status_cancelled') || 'Cancelled'; return appointment.status; })()}
                                </Badge>
                                {appointment.consultation_fee && (
                                  <Badge variant="outline">
                                    ${appointment.consultation_fee}
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1">
                                  {appointment.status === 'scheduled' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateAppointmentStatus(appointment.id, 'confirmed')}
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      {t('dd_confirm') || 'Confirm'}
                                    </Button>
                                  )}
                                  {appointment.status === 'confirmed' && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleStartConsultation(appointment)}
                                    >
                                      <Stethoscope className="w-4 h-4 mr-1" />
                                      {t('dd_consult') || 'Consult'}
                                    </Button>
                                  )}
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setActiveTab("patients");
                                      toast({
                                        title: t('patients') || 'Patients',
                                        description: t('viewing_patient_profile') || 'Viewing patient profile...',
                                      });
                                    }}
                                  >
                                    <User className="w-4 h-4 mr-1" />
                                    {t('patients') || 'Patients'}
                                  </Button>
                                  {['scheduled', 'confirmed'].includes(appointment.status) && (
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedAppointment(appointment);
                                        setShowCancelModal(true);
                                      }}
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      {t('dd_cancel') || 'Cancel'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* View All/Show Less Button */}
                          {allAppointments.length > 10 && (
                            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                              <Button
                                variant="outline"
                                onClick={() => setShowAllAppointments(!showAllAppointments)}
                              >
                                {showAllAppointments ? (
                                  <>
                                    {t('show_less') || 'Show Less'}
                                  </>
                                ) : (
                                  <>
                                    {t('view_all') || 'View All'} {allAppointments.length} {t('appointments') || 'Appointments'}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <Calendar className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">{t('appointments_no_appointments_title') || 'No Appointments Yet'}</h3>
                          <p className="text-gray-600 dark:text-gray-400 mb-4">
                            {t('appointments_no_appointments_desc') || "You haven't booked any appointments yet. Start by booking your first appointment."}
                          </p>
                          <Button
                            onClick={() => {
                              setActiveTab("schedule");
                              toast({
                                title: t('dd_new_appointment') || 'New Appointment',
                                description: t('opening_booking_form') || 'Opening appointment booking form...',
                              });
                            }}
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {t('dd_schedule_first') || 'Schedule First Appointment'}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Appointment Quick Actions */}
                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        {t('quick_actions') || 'Quick Actions'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Button
                          className="flex items-center gap-2 h-12"
                          onClick={() => {
                            setActiveTab('schedule');
                            toast({
                              title: t('dd_schedule_tab') || 'Schedule',
                              description: t('opening_schedule_mgmt') || 'Opening schedule management...',
                            });
                          }}
                        >
                          <CalendarDays className="w-4 h-4" />
                          {t('dd_schedule_tab') || 'Schedule'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 h-12"
                          onClick={() => {
                            fetchDoctorData();
                            toast({
                              title: t('dd_refresh') || 'Refresh',
                              description: t('updated') || 'Refreshing appointment data...',
                            });
                          }}
                        >
                          <Activity className="w-4 h-4" />
                          {t('dd_refresh') || 'Refresh'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 h-12"
                          onClick={() => {
                            setActiveTab("patients");
                            toast({
                              title: t('patients') || 'Patients',
                              description: t('switching_view') || 'Switching to patients view...',
                            });
                          }}
                        >
                          <Users className="w-4 h-4" />
                          {t('patients') || 'Patients'}
                        </Button>
                        <Button
                          variant="outline"
                          className="flex items-center gap-2 h-12"
                          onClick={() => {
                            setActiveTab("profile");
                            toast({
                              title: t('settings') || 'Settings',
                              description: t('opening_profile_settings') || 'Opening profile settings...',
                            });
                          }}
                        >
                          <Settings className="w-4 h-4" />
                          {t('settings') || 'Settings'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Schedule Calendar Tab */}
              <TabsContent value="schedule-calendar" className="h-full">
                <DoctorScheduleCalendar
                  appointments={allAppointments || []}
                  onAppointmentClick={(appointment: Appointment) => {
                    // Open detailed appointment modal
                    setSelectedAppointmentForDetails(appointment);
                    setShowAppointmentDetails(true);
                  }}
                  onStatusUpdate={async (appointmentId: string, newStatus: string) => {
                    // Handle status update
                    try {
                      // You can implement the status update API call here
                      toast({
                        title: t('dd_status_updated') || 'Status Updated',
                        description: t('dd_appointment_status_updated') || 'Appointment status has been updated successfully.'
                      });
                      // Refresh appointments
                      await fetchDoctorData();
                    } catch (error) {
                      toast({
                        title: t('dd_error') || 'Error',
                        description: t('dd_failed_to_update_status') || 'Failed to update appointment status.',
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </TabsContent>

              <TabsContent value="patients" className="p-6 h-full">
                <div className="relative p-6 rounded-2xl glass-effect mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Users className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">{t('dd_patients_title') || 'Patients'}</h2>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_patient_list_activity') || 'Your patient list and activity'}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-6 scroll-animation" data-animation="slide-in-up">
                  {/* Patient Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {patients?.length || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('dd_total_patients') || 'Total Patients'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                            <UserCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {patients?.filter(p => p.lastAppointment && new Date(p.lastAppointment) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('active_30_days') || 'Active (30 days)'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                            <Heart className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {patients?.reduce((sum, p) => sum + (p.totalAppointments || 0), 0) || 0}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('total_visits') || 'Total Visits'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                              {(() => {
                                const dist = analytics?.analytics?.patientDemographics?.genderDistribution as Record<string, number> | undefined
                                if (dist && Object.keys(dist).length > 0) {
                                  const total = Object.values(dist).reduce((a, b) => a + (Number(b) || 0), 0)
                                  const female = Number(dist.female || 0)
                                  return total ? Math.round((female / total) * 100) : 0
                                }
                                // Fallback: compute from loaded patients to avoid placeholders
                                let female = 0
                                let total = 0
                                  ; (patients || []).forEach((p: any) => {
                                    const g = (p.gender || '').toLowerCase()
                                    if (!g) return
                                    total += 1
                                    if (g === 'female' || g === 'f') female += 1
                                  })
                                return total ? Math.round((female / total) * 100) : 0
                              })()}%
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{t('female_patients') || 'Female Patients'}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Patient List */}
                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        {t('patients') || 'Patients'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {patients && patients.length > 0 ? (
                        <div className="space-y-4">
                          {(showAllPatients ? patients : patients.slice(0, 10)).map((patient) => (
                            <div
                              key={patient.id}
                              className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-[#1F1F23] bg-gray-50 dark:bg-[#1A1A1E] hover:bg-gray-100 dark:hover:bg-[#2A2A2E] transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-medium">
                                    {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                                  </span>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                    {patient.name}
                                  </h4>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3" />
                                      {patient.email}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      {patient.phone}
                                    </span>
                                    {patient.age && (
                                      <span>{patient.age} {t('years_old') || 'years old'}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {patient.totalAppointments || 0} {t('visits') || 'visits'}
                                    </Badge>
                                    {patient.lastAppointment && (
                                      <Badge variant="secondary" className="text-xs">
                                        {(t('last_visit') || 'Last visit')}: {new Date(patient.lastAppointment).toLocaleDateString(locale || 'en-US')}
                                      </Badge>
                                    )}
                                    {patient.gender && (
                                      <Badge variant="outline" className="text-xs">
                                        {patient.gender}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewPatient(patient.id)}
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  {t('medical_records') || 'Records'}
                                </Button>
                              </div>
                            </div>
                          ))}

                          {patients.length > 10 && (
                            <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                              <Button
                                variant="outline"
                                onClick={() => setShowAllPatients(!showAllPatients)}
                              >
                                {showAllPatients ? (
                                  <>
                                    {t('show_less') || 'Show Less'}
                                  </>
                                ) : (
                                  <>
                                    {t('view_all') || 'View All'} {patients.length} {t('patients') || 'Patients'}
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <UserCheck className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-600 dark:text-gray-400">{t('noData') || 'No patients yet'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                            {t('patients_will_appear') || 'Patients will appear here after their first appointment'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="schedule" className="p-6 h-full">
                <div className="relative p-6 rounded-2xl glass-effect mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Clock className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">{t('dd_schedule_title') || 'Schedule'}</h2>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_manage_availability') || 'Manage your availability and time slots'}</p>
                    </div>
                  </div>
                </div>
                <div className="scroll-animation" data-animation="slide-in-up">
                  {/* Key prop changes when switching tabs, forcing refetch of centers */}
                  {activeTab === 'schedule' && (
                    <DoctorScheduleManagement
                      key="schedule-active"
                      doctorId={doctorProfile?.id || ''}
                    />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="centers" className="p-6 h-full">
                <div className="relative p-6 rounded-2xl glass-effect mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Building2 className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">{t('dd_centers_title') || 'Centers'}</h2>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_manage_medical_centers') || 'Manage your associated medical centers'}</p>
                    </div>
                  </div>
                </div>
                <div className="scroll-animation" data-animation="slide-in-up">
                  <DoctorCenterManagement />
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="p-6 h-full">
                <div className="relative p-6 rounded-2xl glass-effect mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Star className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">{t('dd_reviews_title') || 'Reviews & Ratings'}</h2>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_view_patient_reviews') || 'View all patient reviews and ratings'}</p>
                    </div>
                  </div>
                </div>

                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : reviews.length === 0 ? (
                  <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                    <CardContent className="p-12 text-center">
                      <Star className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        {t('dd_no_reviews') || 'No Reviews Yet'}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {t('dd_no_reviews_description') || 'You haven\'t received any reviews from patients yet.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {/* Average Rating Summary */}
                    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_average_rating') || 'Average Rating'}</p>
                            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                              {reviews.length > 0
                                ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(2)
                                : '0.00'}★
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {reviews.length} {reviews.length === 1 ? (t('dd_review') || 'review') : (t('dd_reviews') || 'reviews')}
                            </p>
                          </div>
                          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                            <Star className="w-8 h-8 text-yellow-600 dark:text-yellow-400 fill-yellow-600 dark:fill-yellow-400" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Reviews List */}
                    <div className="space-y-4">
                      {reviews.map((review) => {
                        const patientName = review.patient_name || review.patient?.name || t('dd_anonymous_patient') || 'Anonymous Patient';
                        return (
                          <Card key={review.id} className="border-0 shadow-lg shadow-emerald-500/5">
                            <CardContent className="p-6">
                              <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                                    {patientName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">
                                      {patientName}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                      {new Date(review.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`w-5 h-5 ${star <= (review.rating || 0)
                                        ? 'text-yellow-500 fill-yellow-500'
                                        : 'text-gray-300 dark:text-gray-600'
                                        }`}
                                    />
                                  ))}
                                  <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                                    {review.rating?.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-gray-700 dark:text-gray-300 mt-3 leading-relaxed">
                                  {review.comment}
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="profile" className="p-6 h-full">
                <div className="relative p-6 rounded-2xl glass-effect mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl gradient-emerald animate-glow"><Settings className="h-5 w-5 text-white" /></div>
                    <div>
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">{t('dd_profile_settings_title') || 'Profile Settings'}</h2>
                      <p className="text-emerald-700/80 dark:text-emerald-400/80">{t('dd_update_practice_info') || 'Update your personal and practice information'}</p>
                    </div>
                  </div>
                </div>
                <DoctorProfileSettings
                  onProfileUpdate={(updatedProfile) => {
                    setDoctorProfile(updatedProfile);
                    toast({
                      title: t('success') || 'Success',
                      description: t('profile_updated') || 'Profile updated successfully',
                    });
                  }}
                />
              </TabsContent>
            </Tabs>

            {/* Patient Details Modal */}
            {showPatientModal && selectedPatient && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
                    <div className="flex items-center justify-between">
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                        Patient Details: {selectedPatient.name}
                      </h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPatientModal(false)}
                      >
                        <XCircle className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Patient Information */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">{t('dd_basic_info') || 'Basic Information'}</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">{t('dd_name_label') || 'Name:'}</span> {selectedPatient.name}</p>
                          <p><span className="font-medium">{t('dd_email_label') || 'Email:'}</span> {selectedPatient.email}</p>
                          <p><span className="font-medium">{t('dd_phone_label') || 'Phone:'}</span> {selectedPatient.phone}</p>
                          <p><span className="font-medium">{t('dd_age_label') || 'Age:'}</span> {selectedPatient.age || 'N/A'}</p>
                          <p><span className="font-medium">{t('dd_gender_label') || 'Gender:'}</span> {selectedPatient.gender || 'N/A'}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">Medical History</h3>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Allergies:</span> {selectedPatient.allergies || 'None reported'}</p>
                          <p><span className="font-medium">Current Medications:</span> {selectedPatient.medications || 'None reported'}</p>
                          <p><span className="font-medium">Medical History:</span> {selectedPatient.medical_history || 'None reported'}</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-medium text-gray-900 dark:text-white">{t('dd_emergency_contact') || 'Emergency Contact'}</h3>
                        <div className="space-y-2 text-sm">
                          {selectedPatient.emergency_contact ? (
                            <>
                              <p><span className="font-medium">{t('dd_name_label') || 'Name:'}</span> {selectedPatient.emergency_contact.name}</p>
                              <p><span className="font-medium">{t('dd_phone_label') || 'Phone:'}</span> {selectedPatient.emergency_contact.phone}</p>
                              <p><span className="font-medium">{t('dd_relationship_label') || 'Relationship:'}</span> {selectedPatient.emergency_contact.relationship}</p>
                            </>
                          ) : (
                            <p className="text-gray-500 dark:text-gray-400">{t('dd_no_emergency_contact') || 'No emergency contact provided'}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Medical Records */}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">Medical Records</h3>
                      {selectedPatient.medicalRecords && selectedPatient.medicalRecords.length > 0 ? (
                        <div className="space-y-3">
                          {selectedPatient.medicalRecords.map((record) => (
                            <div key={record.id} className="border border-gray-200 dark:border-[#1F1F23] rounded-lg p-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <p className="font-medium text-sm">Diagnosis</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{record.diagnosis}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Treatment</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{record.treatment}</p>
                                </div>
                                <div>
                                  <p className="font-medium text-sm">Prescription</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{record.prescription || 'None'}</p>
                                </div>
                              </div>
                              {record.notes && (
                                <div className="mt-2">
                                  <p className="font-medium text-sm">Notes</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{record.notes}</p>
                                </div>
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                {new Date(record.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No medical records found</p>
                      )}
                    </div>

                    {/* Appointment History with Symptoms */}
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white mb-3">Appointment History & Symptoms</h3>
                      {selectedPatient.appointmentHistory && selectedPatient.appointmentHistory.length > 0 ? (
                        <div className="space-y-3">
                          {selectedPatient.appointmentHistory.map((appointment) => (
                            <div key={appointment.id} className="border border-gray-200 dark:border-[#1F1F23] rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div>
                                  <p className="font-medium text-sm">
                                    {appointment.appointment_date} at {appointment.appointment_time}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-500">
                                    {appointment.appointment_type} • {appointment.type}
                                  </p>
                                </div>
                                <Badge variant={
                                  appointment.status === 'completed' ? 'default' :
                                    appointment.status === 'cancelled' ? 'destructive' :
                                      'secondary'
                                }>
                                  {appointment.status}
                                </Badge>
                              </div>
                              {appointment.symptoms && (
                                <div>
                                  <p className="font-medium text-sm">Symptoms</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.symptoms}</p>
                                </div>
                              )}
                              {appointment.cancellation_reason && (
                                <div className="mt-2">
                                  <p className="font-medium text-sm text-red-600 dark:text-red-400">Cancellation Reason</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.cancellation_reason}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No appointment history found</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Medical Record Form Modal */}
            {showMedicalRecordForm && selectedAppointment && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg shadow-xl max-w-2xl w-full">
                  <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Complete Consultation - {selectedAppointment.patient_name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}
                    </p>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Patient Symptoms */}
                    {selectedAppointment.symptoms && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Patient Symptoms
                        </label>
                        <p className="text-sm text-gray-600 dark:text-gray-400 p-3 bg-gray-50 dark:bg-[#1F1F23] rounded-lg">
                          {selectedAppointment.symptoms}
                        </p>
                      </div>
                    )}

                    {/* Diagnosis */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Diagnosis *
                      </label>
                      <textarea
                        value={medicalRecordForm.diagnosis}
                        onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, diagnosis: e.target.value }))}
                        className="w-full p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                        rows={3}
                        placeholder="Enter diagnosis..."
                        required
                      />
                    </div>

                    {/* Treatment */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Treatment *
                      </label>
                      <textarea
                        value={medicalRecordForm.treatment}
                        onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, treatment: e.target.value }))}
                        className="w-full p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                        rows={3}
                        placeholder="Enter treatment plan..."
                        required
                      />
                    </div>

                    {/* Prescription */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Prescription
                      </label>
                      <textarea
                        value={medicalRecordForm.prescription}
                        onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, prescription: e.target.value }))}
                        className="w-full p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                        rows={3}
                        placeholder="Enter prescription details..."
                      />
                    </div>

                    {/* Additional Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Additional Notes
                      </label>
                      <textarea
                        value={medicalRecordForm.notes}
                        onChange={(e) => setMedicalRecordForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                        rows={2}
                        placeholder="Additional notes..."
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        onClick={handleSaveMedicalRecord}
                        disabled={!medicalRecordForm.diagnosis || !medicalRecordForm.treatment}
                        className="flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Complete Consultation
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowMedicalRecordForm(false);
                          setSelectedAppointment(null);
                          setMedicalRecordForm({ diagnosis: '', treatment: '', prescription: '', notes: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cancel Appointment Modal */}
            {showCancelModal && selectedAppointment && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-[#0F0F12] rounded-lg shadow-xl max-w-md w-full">
                  <div className="p-6 border-b border-gray-200 dark:border-[#1F1F23]">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Cancel Appointment
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedAppointment.patient_name} - {selectedAppointment.appointment_date} at {selectedAppointment.appointment_time}
                    </p>
                  </div>

                  <div className="p-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Cancellation Reason (Optional)
                      </label>
                      <textarea
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full p-3 border border-gray-200 dark:border-[#1F1F23] rounded-lg bg-white dark:bg-[#0F0F12] text-gray-900 dark:text-white"
                        rows={3}
                        placeholder="Reason for cancellation (will be visible to patient)..."
                      />
                    </div>

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="destructive"
                        onClick={handleCancelAppointment}
                        className="flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Appointment
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowCancelModal(false);
                          setSelectedAppointment(null);
                          setCancelReason('');
                        }}
                      >
                        Keep Appointment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Appointment Details Modal */}
            <AppointmentDetailsModal
              appointment={selectedAppointmentForDetails}
              isOpen={showAppointmentDetails}
              onClose={() => {
                setShowAppointmentDetails(false);
                setSelectedAppointmentForDetails(null);
              }}
            />
          </main>
        </div>
      </div>
    </div>
  );
}
