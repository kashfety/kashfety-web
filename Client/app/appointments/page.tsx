"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, MapPin, User, Phone, ArrowLeft, Plus, RefreshCw } from "lucide-react"
import { useAuth } from "@/lib/providers/auth-provider"
import Header from "@/components/Header"
import Sidebar from "@/components/Sidebar"
import { appointmentService } from "@/lib/api"
import RescheduleModal from "@/components/RescheduleModal"
import CancelModal from "@/components/CancelModal"
import ReviewModal from "@/components/ReviewModal"
import VisitSummaryModal from "@/components/VisitSummaryModal"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLocale } from "@/components/providers/locale-provider"
import { toArabicNumerals } from "@/lib/i18n"

interface Appointment {
  id: string
  doctorName: string
  specialty: string
  date: string
  time: string
  duration: string
  type: string
  status: string
  location: string
  address: string
  phone: string
  notes: string
  isHomeVisit: boolean
  appointment_date: string
  appointment_time: string
  doctor_id?: string  // Add doctor_id field
  center_id?: string
  doctor?: {
    name: string
    first_name?: string
    last_name?: string
    first_name_ar?: string
    last_name_ar?: string
    name_ar?: string
    specialty: string
    specialty_ar?: string
    specialty_ku?: string
    specialty_en?: string
    phone: string
  }
  centers?: {
    name: string
    name_ar?: string
    address: string
  }
  center?: {
    name: string
    name_ar?: string
    address: string
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800 border-green-200"
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

export default function MyAppointmentsPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { t, locale, isRTL } = useLocale()

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev)
  }

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all') // clinic | home | all
  const [startDate, setStartDate] = useState<string>('') // YYYY-MM-DD
  const [endDate, setEndDate] = useState<string>('') // YYYY-MM-DD
  const [searchText, setSearchText] = useState<string>('')

  const filteredAppointments = useMemo(() => {
    const matchesStatus = (a: Appointment) => statusFilter === 'all' || (a.status || '').toLowerCase() === statusFilter
    const matchesType = (a: Appointment) => {
      if (typeFilter === 'all') return true
      const isHome = !!a.isHomeVisit || (a.location || '').toLowerCase().includes('home')
      return typeFilter === 'home' ? isHome : !isHome
    }
    const toDate = (d: string) => {
      try { 
        // Parse date as local date to avoid timezone issues
        if (d.includes('T')) {
          return new Date(d).setHours(0,0,0,0)
        } else {
          const [year, month, day] = d.split('-').map(Number);
          return new Date(year, month - 1, day).setHours(0,0,0,0);
        }
      } catch { return NaN }
    }
    const matchesDate = (a: Appointment) => {
      const apt = toDate(a.appointment_date)
      if (startDate) {
        const s = toDate(startDate)
        if (!isNaN(s) && apt < s) return false
      }
      if (endDate) {
        const e = toDate(endDate)
        if (!isNaN(e) && apt > e) return false
      }
      return true
    }
    const q = searchText.trim().toLowerCase()
    const matchesSearch = (a: Appointment) => {
      if (!q) return true
      return (
        (a.doctorName || '').toLowerCase().includes(q) ||
        (a.specialty || '').toLowerCase().includes(q)
      )
    }
    return appointments.filter(a => matchesStatus(a) && matchesType(a) && matchesDate(a) && matchesSearch(a))
  }, [appointments, statusFilter, typeFilter, startDate, endDate, searchText])

  const showingCountText = `${locale === 'ar' ? 'عرض' : 'Showing'} ${toArabicNumerals(filteredAppointments.length, locale)} ${locale === 'ar' ? 'من' : 'of'} ${toArabicNumerals(appointments.length, locale)}`

  // Helper functions for localized names
  const getLocalizedDoctorName = (appointment: Appointment) => {
    if (!appointment.doctor) return appointment.doctorName || t('unknown_doctor') || 'Unknown Doctor'
    
    if (locale === 'ar') {
      if (appointment.doctor.name_ar) return appointment.doctor.name_ar
      if (appointment.doctor.first_name_ar && appointment.doctor.last_name_ar) {
        return `${appointment.doctor.first_name_ar} ${appointment.doctor.last_name_ar}`
      }
      if (appointment.doctor.first_name_ar) return appointment.doctor.first_name_ar
    }
    return appointment.doctor.name || appointment.doctorName || t('unknown_doctor') || 'Unknown Doctor'
  }

  const getLocalizedCenterName = (appointment: Appointment) => {
    const center = appointment.center || appointment.centers
    if (!center) return appointment.location || t('unknown_location') || 'Unknown Location'
    
    if (locale === 'ar' && center.name_ar) {
      return center.name_ar
    }
    return center.name || appointment.location || t('unknown_location') || 'Unknown Location'
  }

  // Function to fetch reviewed appointment IDs
  const fetchReviewedAppointments = async (appointmentIds: string[]) => {
    if (!user?.id || appointmentIds.length === 0) return
    
    try {
      const response = await fetch(`/api/reviews?appointment_ids=${appointmentIds.join(',')}&patient_id=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.reviewedAppointmentIds) {
        setReviewedIds(new Set(data.reviewedAppointmentIds))
      }
    } catch (error) {
      console.error('Failed to fetch reviewed appointments:', error)
    }
  }

  // Function to refresh appointments
  const refreshAppointments = async () => {
    if (!user) return

  // Helper to get localized specialty from doctor object
  const getLocalizedSpecialty = (doctor: any) => {
    if (!doctor) return 'General Medicine';
    if (locale === 'ar' && doctor.specialty_ar) {
      return doctor.specialty_ar;
    }
    if (locale === 'ku' && doctor.specialty_ku) {
      return doctor.specialty_ku;
    }
    return doctor.specialty_en || doctor.specialty || 'General Medicine';
  }

  // Helper to get localized doctor name from doctor object
  const getLocalizedDoctorName = (doctor: any) => {
    if (!doctor) return locale === 'ar' ? 'د. طبيب' : 'Dr. Doctor';
    
    if (locale === 'ar') {
      // If we have Arabic name, use it
      if (doctor.name_ar) return doctor.name_ar;
      if (doctor.first_name_ar && doctor.last_name_ar) {
        return `${doctor.first_name_ar} ${doctor.last_name_ar}`;
      }
      if (doctor.first_name_ar) return doctor.first_name_ar;
    }
    
    // Fallback to English name
    if (doctor.first_name && doctor.last_name) {
      return `${doctor.first_name} ${doctor.last_name}`;
    }
    return doctor.name || 'Doctor';
  }

  // Helper to get localized center name
  const getLocalizedCenterName = (center: any) => {
    if (!center) return '';
    if (locale === 'ar' && center.name_ar) {
      return center.name_ar;
    }
    return center.name || '';
  }
    
    try {
      setAppointmentsLoading(true)
      setError(null)
      
      // Use the API service to fetch appointments
      const appointmentsResponse = await appointmentService.getAppointments();
      if (!appointmentsResponse.appointments) {
        setAppointments([]);
        setAppointmentsLoading(false);
        return;
      }
      
      // Transform the data to match our interface
      const transformedAppointments: Appointment[] = appointmentsResponse.appointments.map((apt: any) => {
        console.log('🔍 Raw appointment data:', {
          id: apt.id,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          status: apt.status
        });
        
        // Handle appointment date more safely with timezone-aware parsing
        let appointmentDate: Date;
        if (!apt.appointment_date) {
          console.warn('⚠️ Missing appointment_date for appointment:', apt.id);
          appointmentDate = new Date(); // fallback to today
        } else {
          // Parse date string as local date to avoid timezone issues
          const dateString = apt.appointment_date;
          console.log('📅 Parsing date string:', dateString);
          
          if (dateString.includes('T')) {
            // If it's an ISO string, parse normally
            appointmentDate = new Date(dateString);
            console.log('📅 Parsed as ISO date:', appointmentDate);
          } else {
            // If it's just a date (YYYY-MM-DD), parse as local date
            const [year, month, day] = dateString.split('-').map(Number);
            appointmentDate = new Date(year, month - 1, day); // month is 0-indexed
            console.log('📅 Parsed as local date:', appointmentDate, 'from parts:', { year, month: month - 1, day });
          }
          
          // Check if the date is valid
          if (isNaN(appointmentDate.getTime())) {
            console.warn('⚠️ Invalid appointment_date:', apt.appointment_date, 'for appointment:', apt.id);
            appointmentDate = new Date(); // fallback to today
          }
        }
        
        console.log('📅 Parsed appointment date:', appointmentDate, 'from:', apt.appointment_date);
        
        const appointmentTime = apt.appointment_time
        
        // Format date
        const formattedDate = appointmentDate.toLocaleDateString(locale || 'en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
        
        console.log('📅 Formatted date:', formattedDate, 'from parsed date:', appointmentDate);
        
        // Format time
        let formattedTime = appointmentTime;
        try {
          const [hours, minutes] = appointmentTime.split(':');
          const timeObj = new Date();
          timeObj.setHours(parseInt(hours), parseInt(minutes), 0);
          formattedTime = timeObj.toLocaleTimeString(locale || 'en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: locale !== 'ar'
          });
        } catch {
          formattedTime = appointmentTime;
        }
        
        // Get doctor and center information
        const doctorPhone = apt.doctor?.phone || apt.doctor_phone || 'N/A';
        const isHomeVisit = (apt.appointment_type === 'home' || apt.appointment_type === 'home_visit' || apt.type === 'home_visit');
        let center = apt.center || apt.centers || null;
        let centerName = isHomeVisit ? (t('appointments_type_home_visit') || 'Home Visit') : (getLocalizedCenterName(center) || apt.center_name || '');
        let centerAddress = isHomeVisit ? (apt.patient_address || '') : (center?.address || apt.center_address || '');
        if (!isHomeVisit && !centerName && apt.center_id) centerName = t('appointments_type_clinic_consultation') || 'Clinic Consultation'
        
        return {
          id: apt.id,
          doctorName: getLocalizedDoctorName(apt.doctor),
          specialty: getLocalizedSpecialty(apt.doctor),
          date: formattedDate,
          time: formattedTime,
          duration: `${toArabicNumerals(apt.duration || 30, locale)} ${t('minutes_short') || 'min'}`,
          type: isHomeVisit ? (t('appointments_type_home_visit') || 'Home Visit') : (t('appointments_type_clinic_consultation') || 'Clinic Consultation'),
          status: apt.status || 'scheduled',
          location: centerName || (t('appointments_type_clinic_consultation') || 'Clinic Consultation'),
          address: centerAddress,
          phone: doctorPhone,
          notes: apt.notes || '',
          isHomeVisit,
          appointment_date: apt.appointment_date,
          appointment_time: apt.appointment_time,
          doctor_id: apt.doctor_id || apt.doctor?.id || null,
          center_id: apt.center_id || null
        }
      })
      
      setAppointments(transformedAppointments)
      
      // Fetch reviewed appointment IDs after appointments are loaded
      const appointmentIds = transformedAppointments.map(apt => apt.id)
      if (appointmentIds.length > 0) {
        await fetchReviewedAppointments(appointmentIds)
      }
      
      setAppointmentsLoading(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load appointments')
      setAppointmentsLoading(false)
    }
  }

  useEffect(() => {
    document.title = `${t('appointments_page_title') || 'My Appointments'} | Kashfety`
  }, [t])

  // Refresh appointments when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) refreshAppointments();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user])

  // Fetch appointments when user is loaded
  useEffect(() => {
    if (user && !loading) refreshAppointments()
  }, [user, loading])

  // Refresh appointments display when locale changes (to update localized fields)
  useEffect(() => {
    // Force component re-render when locale changes by updating a dummy state
    // This ensures DB-fetched localized fields are displayed correctly
    if (appointments.length > 0) {
      // Trigger re-computation of localized values
      setAppointments([...appointments])
    }
  }, [locale])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [user, loading, router])

  // Handler functions for reschedule and cancel
  const handleReschedule = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setRescheduleModalOpen(true)
  }

  const handleCancel = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
    setCancelModalOpen(true)
  }

  const handleModalSuccess = () => {
    // Refresh appointments after successful action
    refreshAppointments()
  }

  // Function to update a specific appointment without full refresh
  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    setAppointments(prevAppointments => 
      prevAppointments.map(apt => 
        apt.id === updatedAppointment.id ? updatedAppointment : apt
      )
    )
  }

  useEffect(() => {
    // When appointments change, enrich any missing center names using center_id
    const missing = appointments.filter(a => !a.isHomeVisit && a.center_id && (!a.location || a.location === (t('appointments_type_clinic_consultation') || 'Clinic Consultation')));
    if (missing.length === 0) return;
    const uniqueIds = Array.from(new Set(missing.map(a => a.center_id))).filter(Boolean) as string[];
    if (uniqueIds.length === 0) return;
    Promise.all(uniqueIds.map(id => fetch(`/api/centers/${id}`).then(r => r.json()).catch(() => null)))
      .then(results => {
        const idToCenter: Record<string, { name?: string; address?: string }> = {};
        results.forEach((res: any) => {
          if (res?.success && res.center?.id) {
            idToCenter[res.center.id] = { name: res.center.name, address: res.center.address };
          }
        });
        if (Object.keys(idToCenter).length === 0) return;
        setAppointments(prev => prev.map((a): Appointment => {
          if (a.center_id && idToCenter[a.center_id]) {
            const name = idToCenter[a.center_id].name || a.location;
            const addr = idToCenter[a.center_id].address || a.address;
            console.log('🏥 Enriched center from id', a.center_id, '→', name);
            return { ...a, location: name || a.location, address: addr || a.address } as Appointment;
          }
          return a as Appointment;
        }));
      })
      .catch(() => {});
  }, [appointments, t]);

  const getStatusText = (status: string) => {
    const s = (status || '').toLowerCase()
    switch (s) {
      case 'scheduled':
        return t('appointments_status_scheduled') || 'Scheduled'
      case 'confirmed':
        return t('appointments_status_confirmed') || 'Confirmed'
      case 'completed':
        return t('appointments_status_completed') || 'Completed'
      case 'cancelled':
        return t('appointments_status_cancelled') || 'Cancelled'
      case 'pending':
        return t('appointments_status_pending') || 'Pending'
      default:
        return s.charAt(0).toUpperCase() + s.slice(1)
    }
  }

  if (loading || appointmentsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('appointments_loading') || 'Loading your appointments...'}</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Header />
        </div>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="text-center py-12">
            <CardContent>
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Error Loading Appointments</h3>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Button onClick={() => window.location.reload()} className="bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90 text-white">Try Again</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
      
      {/* Main Content */}
      <div 
        className="transition-all duration-300"
        style={{
          transform: isRTL 
            ? `translateX(${sidebarOpen ? -280 : 0}px)` 
            : `translateX(${sidebarOpen ? 280 : 0}px)`
        }}
      >
        {/* Header */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Header onMenuToggle={toggleSidebar} />
        </div>

      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="flex items-center gap-2 border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
              <ArrowLeft size={16} />
              {t('appointments_back_home') || 'Back to Home'}
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('appointments_page_title') || 'My Appointments'}</h1>
              <p className="text-muted-foreground mt-1">{t('appointments_page_subtitle') || 'Manage and view your upcoming medical appointments'}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={refreshAppointments} variant="outline" disabled={appointmentsLoading} className="flex items-center gap-2 border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
                <RefreshCw size={16} className={appointmentsLoading ? 'animate-spin' : ''} />
                {appointmentsLoading ? (t('loading') || 'Loading...') : (t('appointments_refresh') || 'Refresh')}
              </Button>
              <Button onClick={() => router.push('/')} className="bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90 text-white flex items-center gap-2">
                <Plus size={16} />
                {t('appointments_book_new') || 'Book New Appointment'}
              </Button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('appointments_status_label') || 'Status'}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('appointments_status_placeholder') || 'All'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('appointments_status_all') || 'All'}</SelectItem>
                    <SelectItem value="scheduled">{t('appointments_status_scheduled') || 'Scheduled'}</SelectItem>
                    <SelectItem value="confirmed">{t('appointments_status_confirmed') || 'Confirmed'}</SelectItem>
                    <SelectItem value="completed">{t('appointments_status_completed') || 'Completed'}</SelectItem>
                    <SelectItem value="cancelled">{t('appointments_status_cancelled') || 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('appointments_type_label') || 'Type'}</label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('appointments_type_placeholder') || 'All'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('appointments_type_all') || 'All'}</SelectItem>
                    <SelectItem value="clinic">{t('appointments_type_clinic') || 'Clinic'}</SelectItem>
                    <SelectItem value="home">{t('appointments_type_home') || 'Home'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('appointments_from_label') || 'From'}</label>
                <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('appointments_to_label') || 'To'}</label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('appointments_search_label') || 'Search'}</label>
                <Input placeholder={t('appointments_search_placeholder') || 'Doctor or specialty'} value={searchText} onChange={e => setSearchText(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between items-center mt-3 text-sm text-muted-foreground">
              <div>
                {showingCountText}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setStartDate(''); setEndDate(''); setSearchText(''); }} className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">{t('appointments_clear_filters') || 'Clear'}</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        {filteredAppointments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground">{t('appointments_no_appointments_title') || 'No Appointments Yet'}</h3>
              <p className="text-muted-foreground mb-6">{t('appointments_no_appointments_desc') || "You haven't booked any appointments yet. Start by booking your first appointment."}</p>
              <Button onClick={() => router.push('/')} className="bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90 text-white">{t('appointments_book_first') || 'Book Your First Appointment'}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredAppointments.map((appointment: Appointment) => (
              <Card key={appointment.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-foreground flex items-center gap-2">
                        <User className="w-5 h-5 text-emerald-600" />
                        {getLocalizedDoctorName(appointment)}
                      </CardTitle>
                      <CardDescription className="text-emerald-600 font-medium">
                        {appointment.specialty}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getStatusColor(appointment.status)} border`}>
                        {getStatusText(appointment.status)}
                      </Badge>
                      {appointment.isHomeVisit ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                          {t('appointments_home_visit_badge') || 'Home'}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
                          {t('appointments_clinic_visit_badge') || 'Clinic'}
                        </Badge>
                      )}
                      {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                        <Badge variant="outline" className="text-xs border-gray-300 text-gray-700">{t('appointments_booked_badge') || 'Booked'}</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Left Column - Time & Location */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-medium">{appointment.date}</div>
                          <div className="text-sm text-gray-500">{t('appointments_date_label') || 'Date'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Clock className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-medium">{(() => { try { const [h,m] = (appointment.appointment_time||'').split(':'); const t2 = new Date(); t2.setHours(parseInt(h), parseInt(m), 0); return t2.toLocaleTimeString(locale || 'en-US', { hour: 'numeric', minute: '2-digit', hour12: locale !== 'ar' }); } catch { return appointment.time; } })()} ({appointment.duration})</div>
                          <div className="text-sm text-gray-500">{t('appointments_duration_label') || 'Duration'}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-3 text-muted-foreground">
                        <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                          <div className="font-medium">{getLocalizedCenterName(appointment)}</div>
                          <div className="text-sm text-gray-500">{appointment.address}</div>
                          {appointment.isHomeVisit && (
                            <Badge variant="secondary" className="mt-1 text-xs bg-green-100 text-green-800">
                              {t('appointments_home_visit_badge') || 'Home Visit'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column - Details & Actions */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Phone className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-medium">{appointment.phone}</div>
                          <div className="text-sm text-gray-500">{t('appointments_contact_number_label') || 'Contact Number'}</div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-foreground mb-1">{t('appointments_appointment_type_label') || 'Appointment Type'}</div>
                        <Badge variant="outline" className="text-sm">
                          {appointment.type}
                        </Badge>
                      </div>
                      
                      {appointment.notes && (
                        <div>
                          <div className="text-sm font-medium text-foreground mb-1">{t('appointments_notes_label') || 'Notes'}</div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                            {appointment.notes}
                          </p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" className="text-[#4DBCC4] border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:text-[#4DBCC4] dark:border-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20" onClick={() => handleReschedule(appointment)} disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}>
                          {t('appointments_reschedule_button') || 'Reschedule'}
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleCancel(appointment)} disabled={appointment.status === 'cancelled' || appointment.status === 'completed'}>
                          {t('appointments_cancel_button') || 'Cancel'}
                        </Button>
                        {appointment.status === 'completed' && (
                          <>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedAppointment(appointment); setReviewOpen(true); }} className="border-yellow-500 text-yellow-700 hover:bg-yellow-50" disabled={reviewedIds.has(appointment.id)}>
                              {reviewedIds.has(appointment.id) ? t('appointments_reviewed_button') || 'Reviewed' : t('appointments_leave_review_button') || 'Leave Review'}
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedAppointment(appointment); setSummaryOpen(true); }} className="border-green-500 text-green-700 hover:bg-green-50">
                              {t('appointments_visit_summary_button') || 'Visit Summary'}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Close main content wrapper */}
      </div>

      {/* Modals */}
      <RescheduleModal isOpen={rescheduleModalOpen} onClose={() => setRescheduleModalOpen(false)} appointment={selectedAppointment} onSuccess={handleModalSuccess} onReschedule={handleAppointmentUpdate} />
      <CancelModal isOpen={cancelModalOpen} onClose={() => setCancelModalOpen(false)} appointment={selectedAppointment} onSuccess={handleModalSuccess} />
      <ReviewModal isOpen={reviewOpen} onClose={() => setReviewOpen(false)} appointmentId={selectedAppointment?.id || ''} doctorId={selectedAppointment?.doctor_id || ''} patientId={user?.id || ''} onSuccess={() => { setReviewOpen(false); setReviewedIds(prev => new Set(prev).add(selectedAppointment?.id || '')); }} />
      <VisitSummaryModal isOpen={summaryOpen} onClose={() => setSummaryOpen(false)} appointmentId={selectedAppointment?.id || ''} patientId={user?.id || ''} doctorId={selectedAppointment?.doctor_id || ''} />
    </div>
  )
}
