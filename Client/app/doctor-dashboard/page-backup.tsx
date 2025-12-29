"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { useLocale } from "@/components/providers/locale-provider"
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
  XCircle
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/ui/locale-switcher";

// Import dashboard components
import FirstTimeDoctorSetup from "@/components/FirstTimeDoctorSetup";
import DoctorProfileSettings from "@/components/DoctorProfileSettings";
import DoctorScheduleManagement from "@/components/DoctorScheduleManagement";
import MedicalCenterManagement from "@/components/MedicalCenterManagement";

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
  total_appointments: number;
  completed_appointments: number;
  pending_appointments: number;
  cancelled_appointments: number;
  total_revenue: number;
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  last_visit?: string;
  next_appointment?: string;
}

interface Analytics {
  monthly_revenue: number;
  monthly_patients: number;
  patient_satisfaction: number;
  revenue_growth: number;
}

interface Appointment {
  id: string;
  patient_name: string;
  appointment_time: string;
  type: string;
  status: string;
}

// Sidebar Component
function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme } = useTheme();

  function handleNavigation() {
    setIsMobileMenuOpen(false);
  }

  function NavItem({
    href,
    icon: Icon,
    children,
    isActive = false,
  }: {
    href: string;
    icon: any;
    children: React.ReactNode;
    isActive?: boolean;
  }) {
    return (
      <Link
        href={href}
        onClick={handleNavigation}
        className={`flex items-center px-3 py-2.5 text-sm rounded-lg transition-all duration-200 ${isActive
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500"
          : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-[#1F1F23]"
          }`}
      >
        <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
        {children}
      </Link>
    );
  }

  return (
    <>
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[70] p-2 rounded-lg bg-white dark:bg-[#0F0F12] shadow-md border border-gray-200 dark:border-[#1F1F23]"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu className="h-5 w-5 text-gray-600 dark:text-gray-300" />
      </button>

      <nav
        className={`
          fixed inset-y-0 left-0 z-[70] w-64 bg-white dark:bg-[#0F0F12] transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static lg:w-64 border-r border-gray-200 dark:border-[#1F1F23]
          ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-[#1F1F23]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                Doctor Portal
              </span>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex-1 overflow-y-auto py-4 px-4">
            <div className="space-y-6">
              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Dashboard
                </div>
                <div className="space-y-1">
                  <NavItem href="#overview" icon={Home} isActive={true}>
                    Overview
                  </NavItem>
                  <NavItem href="#appointments" icon={Calendar}>
                    Appointments
                  </NavItem>
                  <NavItem href="#patients" icon={Users}>
                    Patients
                  </NavItem>
                  <NavItem href="#analytics" icon={BarChart2}>
                    Analytics
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Management
                </div>
                <div className="space-y-1">
                  <NavItem href="#schedule" icon={Clock}>
                    Schedule
                  </NavItem>
                  <NavItem href="#medical-centers" icon={Building2}>
                    Medical Centers
                  </NavItem>
                  <NavItem href="#revenue" icon={DollarSign}>
                    Revenue
                  </NavItem>
                  <NavItem href="#records" icon={FileText}>
                    Medical Records
                  </NavItem>
                </div>
              </div>

              <div>
                <div className="space-y-1">
                  <NavItem href="#messages" icon={MessagesSquare}>
                    Messages
                  </NavItem>
                  <NavItem href="#consultations" icon={Video}>
                    Video Calls
                  </NavItem>
                  <NavItem href="#notifications" icon={Bell}>
                    Notifications
                  </NavItem>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="px-4 py-4 border-t border-gray-200 dark:border-[#1F1F23]">
            <div className="space-y-1">
              <NavItem href="#profile" icon={Settings}>
                Profile Settings
              </NavItem>
              <NavItem href="#help" icon={HelpCircle}>
                Help & Support
              </NavItem>
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
function ProfileHeader({ doctorProfile }: { doctorProfile: DoctorProfile | null }) {
  const { logout } = useAuth();
  const router = useRouter();
  const { t, isRTL } = useLocale();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className={`px-6 flex items-center justify-end gap-4 bg-white dark:bg-[#0F0F12] h-full ${isRTL ? "flex-row-reverse" : ""}`}>
      <LocaleSwitcher />
      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <div className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1F1F23] transition-colors">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className={`hidden sm:block ${isRTL ? "text-right" : "text-left"}`}>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {doctorProfile?.name || t('doctor')}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {doctorProfile?.specialty || "General Practice"}
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
                  {doctorProfile?.name || t('doctor')}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {doctorProfile?.email || "doctor@example.com"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Button variant="outline" className={`w-full ${isRTL ? "justify-end" : "justify-start"}`} size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Profile Settings
              </Button>
              <Button
                variant="outline"
                className={`w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 ${isRTL ? "justify-end" : "justify-start"}`}
                size="sm"
                onClick={handleLogout}
              >
                <User className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function DoctorDashboard() {
  const { t, isRTL } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // States
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<Appointment[]>([]);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    fetchDoctorData();
  }, [router]);

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('auth_token');

      if (!token) {
        router.push('/login');
        return;
      }


      // Fetch doctor profile
      const profileResponse = await fetch('http://localhost:5000/api/auth/doctor/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setDoctorProfile(profileData.doctor);

        // Check if this is first time setup (no specialty set)
        if (!profileData.doctor.specialty) {
          setIsFirstTimeSetup(true);
          setLoading(false);
          return;
        }
      } else {
        const errorText = await profileResponse.text();
        if (profileResponse.status === 401) {
          router.push('/login');
          return;
        }
      }

      // Fetch all dashboard data in parallel with error handling
      const fetchPromises = [
        fetch('http://localhost:5000/api/auth/doctor/today-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => ({ ok: false, error: err })),

        fetch('http://localhost:5000/api/auth/doctor/patients', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => ({ ok: false, error: err })),

        fetch('http://localhost:5000/api/auth/doctor/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(err => ({ ok: false, error: err }))
      ];

      const [todayResponse, patientsResponse, analyticsResponse] = await Promise.all(fetchPromises);

      // Handle today stats
      if (todayResponse.ok && 'json' in todayResponse) {
        const todayData = await todayResponse.json();
        setTodayStats(todayData);
      } else {
        // Set default values
        setTodayStats({
          total_appointments: 0,
          completed_appointments: 0,
          pending_appointments: 0,
          cancelled_appointments: 0,
          total_revenue: 0
        });
      }

      // Handle patients data
      if (patientsResponse.ok && 'json' in patientsResponse) {
        const patientsData = await patientsResponse.json();
        setPatients(patientsData.patients || []);
      } else {
        setPatients([]);
      }

      // Handle analytics data
      if (analyticsResponse.ok && 'json' in analyticsResponse) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      } else {
        setAnalytics({
          monthly_revenue: 0,
          monthly_patients: 0,
          patient_satisfaction: 0,
          revenue_growth: 0
        });
      }

      // Mock recent appointments for now
      setRecentAppointments([
        {
          id: "1",
          patient_name: "John Doe",
          appointment_time: "09:00 AM",
          type: t('consultation'),
          status: "scheduled"
        },
        {
          id: "2",
          patient_name: "Jane Smith",
          appointment_time: "10:30 AM",
          type: "Follow-up",
          status: "completed"
        }
      ]);

    } catch (error) {
      toast({
        title: t('error'),
        description: "Failed to load dashboard data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
    <div className={`flex h-screen ${theme === "dark" ? "dark" : ""}`}>
      <Sidebar />

      <div className="w-full flex flex-1 flex-col">
        <header className="h-16 border-b border-gray-200 dark:border-[#1F1F23]">
          <ProfileHeader doctorProfile={doctorProfile} />
        </header>

        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-[#0F0F12]">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Welcome Header */}
              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between ${isRTL ? "flex-row-reverse" : "flex-row"}`}>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Welcome back, Dr. {doctorProfile?.name?.split(' ')[0]}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Here's what's happening in your practice today
                  </p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    New Appointment
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Appointments</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {todayStats?.total_appointments || 0}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +12%
                      </span>
                      <span className={`text-gray-600 dark:text-gray-400 ml-2 ${isRTL ? "mr-text-gray-600 dark:text-gray-400 ml-2" : "ml-text-gray-600 dark:text-gray-400 ml-2"}`}>from yesterday</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Patients</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {patients.length}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +5%
                      </span>
                      <span className={`text-gray-600 dark:text-gray-400 ml-2 ${isRTL ? "mr-text-gray-600 dark:text-gray-400 ml-2" : "ml-text-gray-600 dark:text-gray-400 ml-2"}`}>this month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Revenue</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {analytics?.monthly_revenue?.toLocaleString() || '0'} {t('currency') || 'SYP'}
                        </p>
                      </div>
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                        <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                      <span className="text-green-600 dark:text-green-400 flex items-center">
                        <TrendingUp className="w-4 h-4 mr-1" />
                        +18%
                      </span>
                      <span className={`text-gray-600 dark:text-gray-400 ml-2 ${isRTL ? "mr-text-gray-600 dark:text-gray-400 ml-2" : "ml-text-gray-600 dark:text-gray-400 ml-2"}`}>from last month</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23] hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient Satisfaction</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                          {analytics?.patient_satisfaction || 95}%
                        </p>
                      </div>
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <Star className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Progress value={analytics?.patient_satisfaction || 95} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Today's Schedule & Recent Patients */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Today's Schedule
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {recentAppointments.length > 0 ? (
                      recentAppointments.map((appointment) => (
                        <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[#1F1F23] rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {appointment.patient_name}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {appointment.type} • {appointment.appointment_time}
                            </p>
                          </div>
                          <Badge
                            variant={appointment.status === 'completed' ? 'default' : 'secondary'}
                            className={
                              appointment.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                            }
                          >
                            {appointment.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <CalendarDays className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No appointments scheduled for today</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23]">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                      Recent Patients
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
                                {patient.last_visit || 'No recent visit'}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View
                          </Button>
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

            {/* Other tabs content */}
            <TabsContent value="appointments">
              <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23]">
                <CardHeader>
                  <CardTitle>Appointment Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Appointment management functionality will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="patients">
              <Card className="bg-white dark:bg-[#0F0F12] border border-gray-200 dark:border-[#1F1F23]">
                <CardHeader>
                  <CardTitle>Patient Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 dark:text-gray-400">
                    Patient management functionality will be implemented here.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="schedule">
              <DoctorScheduleManagement doctorId={doctorProfile?.id || ''} />
            </TabsContent>

            <TabsContent value="profile">
              <DoctorProfileSettings
                onProfileUpdate={(updatedProfile) => {
                  setDoctorProfile(updatedProfile);
                  toast({
                    title: t('success'),
                    description: "Profile updated successfully",
                  });
                }}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
