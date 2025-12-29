"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLocale } from "@/components/providers/locale-provider"
import { 
  Calendar, 
  Users, 
  Clock, 
  DollarSign, 
  TrendingUp,
  Settings,
  Building2,
  Stethoscope,
  User,
  MapPin,
  Phone,
  BarChart3,
  UserPlus
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

// Import new components
import DoctorProfileSettings from "@/components/DoctorProfileSettings";
import FirstTimeDoctorSetup from "@/components/FirstTimeDoctorSetup";
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
  total_earnings: number;
  appointments: any[];
}

interface Patient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  created_at: string;
  appointments_count: number;
  last_visit?: string;
}

interface Analytics {
  age_distribution: { age_group: string; count: number }[];
  gender_distribution: { gender: string; count: number }[];
  appointment_types: { type: string; count: number }[];
  monthly_earnings: { month: string; earnings: number }[];
}

export default function DoctorDashboard() {
  const { t, isRTL } = useLocale()

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    fetchDoctorData();
  }, [router]);

  const fetchDoctorData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch doctor profile
      const profileResponse = await fetch('http://localhost:5000/api/auth/doctor/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
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
      }

      // Fetch all dashboard data in parallel
      const [todayResponse, patientsResponse, analyticsResponse] = await Promise.all([
        fetch('http://localhost:5000/api/auth/doctor/today-stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/auth/doctor/patients', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('http://localhost:5000/api/auth/doctor/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        setTodayStats(todayData);
      }

      if (patientsResponse.ok) {
        const patientsData = await patientsResponse.json();
        setPatients(patientsData.patients || []);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData);
      }

    } catch (error) {
      toast({
        title: t('error'),
        description: "Failed to load dashboard data. Please refresh the page.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setIsFirstTimeSetup(false);
    fetchDoctorData();
  };

  const formatTime = (timeString: string) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isFirstTimeSetup) {
    return <FirstTimeDoctorSetup onSetupComplete={handleSetupComplete} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Dashboard</h2>
          <p className="text-gray-600">Please wait while we load your data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-600 text-white">
                  {doctorProfile ? getInitials(doctorProfile.name) : 'DR'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-xl font-semibold">Dr. {doctorProfile?.name}</h1>
                <p className="text-sm text-gray-600">{doctorProfile?.specialty}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem('token');
                router.push('/login');
              }}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Appointments
            </TabsTrigger>
            <TabsTrigger value="patients" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Patients
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="centers" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Centers
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Today's Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Appointments</p>
                      <p className="text-2xl font-bold">{todayStats?.total_appointments || 0}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600">{todayStats?.completed_appointments || 0}</p>
                    </div>
                    <Stethoscope className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-yellow-600">{todayStats?.pending_appointments || 0}</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Today's Earnings</p>
                      <p className="text-2xl font-bold text-green-600">${todayStats?.total_earnings || 0}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Schedule */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayStats?.appointments && todayStats.appointments.length > 0 ? (
                  <div className="space-y-3">
                    {todayStats.appointments.map((appointment: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">
                            {formatTime(appointment.appointment_time)}
                          </div>
                          <div>
                            <p className="font-medium">{appointment.patient?.name}</p>
                            <p className="text-sm text-gray-600">{appointment.symptoms}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={
                            appointment.status === 'completed' ? 'default' :
                            appointment.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {appointment.status}
                          </Badge>
                          <Badge variant="outline">
                            ${appointment.consultation_fee}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No appointments scheduled for today</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Analytics */}
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Patient Demographics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium mb-2">Age Distribution</h4>
                        <div className="space-y-2">
                          {analytics.age_distribution.map((item, index) => (
                            <div key={index} className="flex justify-between items-center">
                              <span className="text-sm">{item.age_group}</span>
                              <Badge variant="secondary">{item.count}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Appointment Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analytics.appointment_types.map((item, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm capitalize">{item.type.replace('_', ' ')}</span>
                          <Badge variant="outline">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Appointments Tab */}
          <TabsContent value="appointments">
            <Card>
              <CardHeader>
                <CardTitle>Appointment Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Appointment Calendar</h3>
                  <p className="text-gray-600 mb-4">
                    Full appointment management system will be implemented here
                  </p>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Book New Appointment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Patients Tab */}
          <TabsContent value="patients">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Patient List</span>
                  <Badge variant="secondary">{patients.length} patients</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patients.length > 0 ? (
                  <div className="space-y-3">
                    {patients.map((patient) => (
                      <div key={patient.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(patient.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{patient.name}</p>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>{patient.email}</span>
                              {patient.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {patient.phone}
                                </span>
                              )}
                              {patient.date_of_birth && (
                                <span>Age: {new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline">{patient.appointments_count} visits</Badge>
                          {patient.last_visit && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last visit: {new Date(patient.last_visit).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <h3 className="text-lg font-medium mb-2">No Patients Yet</h3>
                    <p className="text-gray-600">Your patient list will appear here as you start seeing patients.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            {doctorProfile && (
              <DoctorScheduleManagement doctorId={doctorProfile.id} />
            )}
          </TabsContent>

          {/* Centers Tab */}
          <TabsContent value="centers">
            {doctorProfile && (
              <MedicalCenterManagement doctorId={doctorProfile.id} />
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            {doctorProfile && (
              <DoctorProfileSettings 
                doctorProfile={doctorProfile}
                onProfileUpdate={setDoctorProfile}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
