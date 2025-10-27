"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, MapPin, User, Phone, ArrowLeft, Plus, RefreshCw, Filter, X } from "lucide-react";
import { useAuth } from "@/lib/providers/auth-provider";
import Header from "@/components/Header";
import { appointmentService } from "@/lib/api";
import RescheduleModal from "@/components/RescheduleModal";
import CancelModal from "@/components/CancelModal";

import { useLocale } from "@/components/providers/locale-provider"
interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  type: string;
  appointment_type: 'clinic' | 'home';
  symptoms?: string;
  consultation_fee: number;
  duration: number;
  created_at: string;
  updated_at: string;
  isHomeVisit?: boolean;
  specialty?: string;
  patient?: {
    name: string;
    email: string;
    phone: string;
  };
  doctor?: {
    id: string;
    name: string;
    specialty: string;
    profile_picture: string;
    phone: string;
  };
  centers?: {
    name: string;
    address: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export default function MyAppointmentsPage() {
  const { t, isRTL } = useLocale()

  const router = useRouter();
  const { user, loading } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSpecialty, setFilterSpecialty] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");

  // Get unique specialties from appointments for filter
  const availableSpecialties = Array.from(new Set(appointments.map(apt => apt.specialty))).sort();

  // Filter appointments based on selected filters
  const filteredAppointments = appointments.filter(appointment => {
    // Type filter
    if (filterType !== "all") {
      if (filterType === "clinic" && appointment.isHomeVisit) return false;
      if (filterType === "home" && !appointment.isHomeVisit) return false;
    }

    // Status filter
    if (filterStatus !== "all" && appointment.status !== filterStatus) {
      return false;
    }

    // Specialty filter
    if (filterSpecialty !== "all" && appointment.specialty !== filterSpecialty) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchAppointments();
    }
  }, [user, loading, router]);

  const fetchAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      setError(null);
      
      const result = await appointmentService.getUserAppointments();
      
      if (result && result.success) {
        const appointmentsData = result.appointments || [];
        setAppointments(appointmentsData);
      } else {
        throw new Error(result?.message || result?.error || 'Failed to fetch appointments');
      }
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      setError(error.message || 'Failed to load appointments');
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const handleModalSuccess = () => {
    setRescheduleModalOpen(false);
    setCancelModalOpen(false);
    setSelectedAppointment(null);
    fetchAppointments();
  };

  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setAppointments(prevAppointments => 
      prevAppointments.map(apt => 
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    );
  };

  if (loading || appointmentsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your appointments...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Header />
        </div>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Appointments</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <Button 
                onClick={() => window.location.reload()}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative">
      {/* Header */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 relative z-10">
        <Header />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div>
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="bg-white hover:bg-gray-50 border-gray-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">t('myAppointments')</h1>
              <p className="text-gray-600">Manage your upcoming and past appointments</p>
            </div>
            <div>
              <Button 
                onClick={() => router.push('/book-appointment')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Book New Appointment
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total</p>
                    <p className="text-2xl font-bold text-gray-900">{appointments.length}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confirmed</p>
                    <p className="text-2xl font-bold text-green-600">{appointments.filter(apt => apt.status === 'confirmed').length}</p>
                  </div>
                  <span className="text-2xl">✅</span>
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">{appointments.filter(apt => apt.status === 'pending').length}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-white shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Home Visits</p>
                    <p className="text-2xl font-bold text-purple-600">{appointments.filter(apt => apt.isHomeVisit).length}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="bg-white hover:bg-gray-50"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            <Button
              variant="outline"
              onClick={fetchAppointments}
              className="bg-white hover:bg-gray-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="filter-type">Appointment Type</Label>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="All types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="clinic">Clinic Visits</SelectItem>
                      <SelectItem value="home">Home Visits</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="filter-specialty">Specialty</Label>
                  <Select value={filterSpecialty} onValueChange={setFilterSpecialty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All specialties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specialties</SelectItem>
                      {availableSpecialties.map(specialty => (
                        <SelectItem key={specialty} value={specialty || ""}>{specialty}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFilterType("all");
                      setFilterStatus("all");
                      setFilterSpecialty("all");
                      setFilterDateFrom("");
                      setFilterDateTo("");
                    }}
                    className="w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-gray-400 text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Appointments Found</h3>
              <p className="text-gray-600 mb-6">
                {appointments.length === 0 
                  ? "You haven't booked any appointments yet." 
                  : "No appointments match your current filters."
                }
              </p>
              <Button 
                onClick={() => router.push('/book-appointment')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Book Your First Appointment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((appointment) => (
              <Card key={appointment.id} className="bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Dr. {appointment.doctor?.name || 'Unknown Doctor'}
                            </h3>
                            <Badge className={getStatusColor(appointment.status)}>
                              {appointment.status}
                            </Badge>
                            {appointment.isHomeVisit && (
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                Home Visit
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{appointment.specialty}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(appointment.appointment_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4" />
                          <span>{appointment.appointment_time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {appointment.isHomeVisit ? <MapPin className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          <span>{appointment.isHomeVisit ? 'Home Visit' : 'Clinic Visit'}</span>
                        </div>
                      </div>

                      {appointment.symptoms && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-1">Symptoms/Complaint:</p>
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">{appointment.symptoms}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Fee: </span>
                          <span className="text-green-600 font-semibold">${appointment.consultation_fee}</span>
                        </div>
                        <div className="flex gap-2">
                          {appointment.status !== 'cancelled' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setRescheduleModalOpen(true);
                                }}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                              >
                                Reschedule
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setCancelModalOpen(true);
                                }}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                              >
                                Cancel
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <RescheduleModal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        appointment={selectedAppointment}
        onSuccess={handleModalSuccess}
        onReschedule={handleAppointmentUpdate}
      />
      
      <CancelModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        appointment={selectedAppointment}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
