"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, FileText, ArrowLeft, RefreshCw, Star, Eye, Download, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/providers/auth-provider";
import Header from "@/components/Header";
import { labService } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import RescheduleModal from "@/components/RescheduleModal";
import CancelModal from "@/components/CancelModal";
import ReviewModal from "@/components/ReviewModal";
import LabResultModal from "@/components/LabResultModal";
import PrepModal, { PrepPlan } from "@/components/PrepModal";

interface LabBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  duration?: number;
  notes?: string;
  fee?: number;
  center?: { id: string; name: string; address: string };
  type?: { id: string; name: string; category: string };
  result_file_url?: string | null;
  rating?: number;
  review?: string;
  preparation_notes?: string;
}

const getStatusColor = (status: string) => {
  switch ((status || '').toLowerCase()) {
    case 'confirmed': return 'bg-green-100 text-green-800 border-green-200';
    case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    case 'no_show': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export default function MyLabsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { t, locale } = useLocale();
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [prepModalOpen, setPrepModalOpen] = useState(false);
  
  // Selected booking for modals
  const [selectedBooking, setSelectedBooking] = useState<LabBooking | null>(null);
  const [prepPlan, setPrepPlan] = useState<PrepPlan | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // lab | imaging | all
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  const filtered = useMemo(() => {
    const statusOk = (b: LabBooking) => statusFilter === 'all' || (b.status || '').toLowerCase() === statusFilter;
    const catOk = (b: LabBooking) => categoryFilter === 'all' || (b.type?.category || '').toLowerCase() === categoryFilter;
    const toDate = (d: string) => { try { return new Date(d).setHours(0,0,0,0);} catch { return NaN; } };
    const dateOk = (b: LabBooking) => {
      const d = toDate(b.booking_date);
      if (startDate) { const s = toDate(startDate); if (!isNaN(s) && d < s) return false; }
      if (endDate) { const e = toDate(endDate); if (!isNaN(e) && d > e) return false; }
      return true;
    };
    const q = searchText.trim().toLowerCase();
    const searchOk = (b: LabBooking) => !q || (b.type?.name || '').toLowerCase().includes(q) || (b.center?.name || '').toLowerCase().includes(q);
    return bookings.filter(b => statusOk(b) && catOk(b) && dateOk(b) && searchOk(b));
  }, [bookings, statusFilter, categoryFilter, startDate, endDate, searchText]);

  const refresh = async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(null);
      const res = await labService.myBookings();
      setBookings(res?.bookings || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load lab bookings');
    } finally {
      setIsLoading(false);
    }
  };

  // Modal handlers
  const handleReschedule = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setRescheduleModalOpen(true);
  };

  const handleCancel = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setCancelModalOpen(true);
  };

  const handleReview = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setReviewModalOpen(true);
  };

  const handleViewResult = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setResultModalOpen(true);
  };

  const handlePrep = (booking: LabBooking) => {
    setSelectedBooking(booking);
    // Generate preparation plan based on test type
    const instructions = generatePrepInstructions(booking.type?.name || '', booking.type?.category || '');
    const plan: PrepPlan = {
      prep_sections: [
        {
          t: `${booking.type?.name} Preparation`,
          i: instructions
        }
      ],
      reminder_24h: '24 hours before your test',
      reminder_3h: '3 hours before your test'
    };
    setPrepPlan(plan);
    setPrepModalOpen(true);
  };

  const generatePrepInstructions = (testName: string, category: string): string[] => {
    const name = testName.toLowerCase();
    const cat = category.toLowerCase();
    
    if (cat === 'imaging') {
      if (name.includes('mri')) {
        return [
          'Remove all metal objects including jewelry, watches, and hairpins',
          'Inform staff of any implants, pacemakers, or metal in your body',
          'Wear comfortable, loose-fitting clothing without metal fasteners',
          'Arrive 15 minutes early for preparation'
        ];
      } else if (name.includes('ct') || name.includes('scan')) {
        return [
          'Wear comfortable, loose-fitting clothing',
          'Remove jewelry and metal objects in the scan area',
          'Inform staff if you are pregnant or might be pregnant',
          'Follow fasting instructions if contrast material is used'
        ];
      } else if (name.includes('ultrasound')) {
        return [
          'Wear comfortable, loose-fitting clothing',
          'For abdominal ultrasound: fast for 8 hours before the exam',
          'For pelvic ultrasound: drink water 1 hour before (do not urinate)',
          'Bring previous ultrasound images if available'
        ];
      }
    } else if (cat === 'lab') {
      if (name.includes('glucose') || name.includes('sugar') || name.includes('diabetes')) {
        return [
          'Fast for 8-12 hours before the test (water is allowed)',
          'Take your regular medications unless instructed otherwise',
          'Avoid alcohol for 24 hours before the test',
          'Schedule test early in the morning when possible'
        ];
      } else if (name.includes('cholesterol') || name.includes('lipid')) {
        return [
          'Fast for 9-12 hours before the test',
          'Avoid alcohol for 24 hours before the test',
          'Maintain your usual diet for 2 weeks before testing',
          'Take medications as prescribed unless told otherwise'
        ];
      } else if (name.includes('urine')) {
        return [
          'Use the first morning urine sample when possible',
          'Avoid excessive hydration before the test',
          'Follow proper collection technique provided by the lab',
          'Bring the sample to the lab within 1 hour of collection'
        ];
      }
    }
    
    // Default instructions
    return [
      'Follow any specific instructions provided by your healthcare provider',
      'Arrive 15 minutes early for check-in',
      'Bring a valid ID and insurance information',
      'Inform staff of any medications you are taking'
    ];
  };

  const onRescheduleSuccess = () => {
    setRescheduleModalOpen(false);
    setSelectedBooking(null);
    refresh();
  };

  const onCancelSuccess = () => {
    setCancelModalOpen(false);
    setSelectedBooking(null);
    refresh();
  };

  const onReviewSuccess = () => {
    setReviewModalOpen(false);
    setSelectedBooking(null);
    refresh();
  };

  useEffect(() => { document.title = `${t('labTestsTitle') || 'Laboratory Tests & Medical Imaging'} | Kashfety`; }, [t]);
  useEffect(() => { if (user && !loading) refresh(); }, [user, loading]);
  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('loading') || 'Loading...'}</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Header />
      </div>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="sm" onClick={() => router.push('/')} className="flex items-center gap-2">
              <ArrowLeft size={16} /> {t('appointments_back_home') || 'Back to Home'}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('my_labs_title') || 'My Lab Tests & Scans'}</h1>
              <p className="text-muted-foreground mt-1">{t('my_labs_subtitle') || 'View and manage your lab test and imaging bookings'}</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={refresh} variant="outline" className="flex items-center gap-2">
                <RefreshCw size={16} /> {t('appointments_refresh') || 'Refresh'}
              </Button>
              <Button onClick={() => router.push('/patient-dashboard/lab-tests')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {t('bookTest') || 'Book Test'}
              </Button>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">{t('appointments_status_label') || 'Status'}</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue placeholder={t('appointments_status_placeholder') || 'All'} /></SelectTrigger>
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
                <label className="block text-xs text-muted-foreground mb-1">{t('type') || 'Type'}</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger><SelectValue placeholder={t('appointments_type_placeholder') || 'All'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('appointments_type_all') || 'All'}</SelectItem>
                    <SelectItem value="lab">{t('lab') || 'Lab'}</SelectItem>
                    <SelectItem value="imaging">{t('imaging') || 'Imaging'}</SelectItem>
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
                <Input placeholder={t('search') || 'Search'} value={searchText} onChange={e => setSearchText(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {filtered.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground">{t('no_labs') || 'No Lab/Imaging Bookings'}</h3>
              <p className="text-muted-foreground mb-6">{t('no_labs_desc') || 'You haven\'t booked any lab tests yet.'}</p>
              <Button onClick={() => router.push('/patient-dashboard/lab-tests')} className="bg-emerald-600 hover:bg-emerald-700 text-white">{t('bookTest') || 'Book Test'}</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filtered.map((booking) => (
              <Card key={booking.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl text-foreground flex items-center gap-2">
                        {booking.type?.name}
                        {booking.rating && (
                          <div className="flex items-center gap-1 ml-2">
                            <Star size={16} className="text-yellow-500 fill-current" />
                            <span className="text-sm text-yellow-600">{booking.rating}</span>
                          </div>
                        )}
                      </CardTitle>
                      <CardDescription className="text-emerald-600 font-medium">
                        {booking.type?.category === 'imaging' ? (t('imaging') || 'Imaging') : (t('lab') || 'Lab')}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.result_file_url && (
                        <div className="flex items-center">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-xs text-green-600 ml-1">Results</span>
                        </div>
                      )}
                      <Badge className={`${getStatusColor(booking.status)} border`}>{(booking.status || '').toUpperCase()}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Calendar className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-medium">{new Date(booking.booking_date).toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                          <div className="text-sm text-gray-500">{t('appointments_date_label') || 'Date'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Clock className="w-5 h-5 text-emerald-600" />
                        <div>
                          <div className="font-medium">{(() => { try { const [h,m] = (booking.booking_time||'').split(':'); const t2 = new Date(); t2.setHours(parseInt(h), parseInt(m), 0); return t2.toLocaleTimeString(locale || 'en-US', { hour: 'numeric', minute: '2-digit', hour12: locale !== 'ar' }); } catch { return booking.booking_time; } })()} ({booking.duration || 30} {t('minutes_short') || 'min'})</div>
                          <div className="text-sm text-gray-500">{t('appointments_duration_label') || 'Duration'}</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-muted-foreground">
                        <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <div>
                          <div className="font-medium">{booking.center?.name}</div>
                          <div className="text-sm text-gray-500">{booking.center?.address}</div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {booking.notes && (
                        <div>
                          <div className="text-sm font-medium text-foreground mb-1">{t('appointments_notes_label') || 'Notes'}</div>
                          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{booking.notes}</p>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="space-y-3">
                        {/* Primary Actions */}
                        <div className="flex gap-2">
                          {booking.status === 'completed' && booking.result_file_url && (
                            <Button 
                              size="sm" 
                              onClick={() => handleViewResult(booking)}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              {t('view_results') || 'View Results'}
                            </Button>
                          )}
                          
                          {booking.status === 'completed' && !booking.rating && (
                            <Button 
                              size="sm" 
                              onClick={() => handleReview(booking)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              <Star className="w-4 h-4 mr-2" />
                              {t('appointments_review_button') || 'Review'}
                            </Button>
                          )}
                          
                          {(booking.status === 'confirmed' || booking.status === 'scheduled') && (
                            <Button 
                              size="sm" 
                              onClick={() => handlePrep(booking)}
                              variant="outline"
                              className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                            >
                              <AlertCircle className="w-4 h-4 mr-2" />
                              {t('appointments_prep_button') || 'Preparation'}
                            </Button>
                          )}
                        </div>
                        
                        {/* Secondary Actions */}
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={booking.status === 'cancelled' || booking.status === 'completed'} 
                            onClick={() => handleReschedule(booking)}
                          >
                            {t('appointments_reschedule_button') || 'Reschedule'}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-600 border-red-600 hover:bg-red-50" 
                            disabled={booking.status === 'cancelled' || booking.status === 'completed'} 
                            onClick={() => handleCancel(booking)}
                          >
                            {t('appointments_cancel_button') || 'Cancel'}
                          </Button>
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
        onClose={() => {
          setRescheduleModalOpen(false);
          setSelectedBooking(null);
        }}
        appointment={selectedBooking ? {
          id: selectedBooking.id,
          doctorName: selectedBooking.center?.name || '',
          specialty: selectedBooking.type?.category || '',
          date: selectedBooking.booking_date,
          time: selectedBooking.booking_time,
          duration: `${selectedBooking.duration || 30} min`,
          type: selectedBooking.type?.name || '',
          status: selectedBooking.status,
          location: selectedBooking.center?.name || '',
          address: selectedBooking.center?.address || '',
          phone: '',
          notes: selectedBooking.notes || '',
          isHomeVisit: false,
          appointment_date: selectedBooking.booking_date,
          appointment_time: selectedBooking.booking_time,
          doctor_id: selectedBooking.center?.id
        } : null}
        onSuccess={onRescheduleSuccess}
      />

      <CancelModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setSelectedBooking(null);
        }}
        appointment={selectedBooking ? {
          id: selectedBooking.id,
          doctorName: selectedBooking.center?.name || '',
          specialty: selectedBooking.type?.category || '',
          date: selectedBooking.booking_date,
          time: selectedBooking.booking_time,
          duration: `${selectedBooking.duration || 30} min`,
          type: selectedBooking.type?.name || '',
          status: selectedBooking.status,
          location: selectedBooking.center?.name || '',
          address: selectedBooking.center?.address || '',
          phone: '',
          notes: selectedBooking.notes || '',
          isHomeVisit: false,
          appointment_date: selectedBooking.booking_date,
          appointment_time: selectedBooking.booking_time,
          doctor_id: selectedBooking.center?.id
        } : null}
        onSuccess={onCancelSuccess}
      />

      <ReviewModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedBooking(null);
        }}
        appointmentId={selectedBooking?.id || ''}
        doctorId={selectedBooking?.center?.id || ''}
        patientId={user?.id || ''}
        onSuccess={onReviewSuccess}
      />

      <LabResultModal
        isOpen={resultModalOpen}
        onClose={() => {
          setResultModalOpen(false);
          setSelectedBooking(null);
        }}
        booking={selectedBooking}
      />

      <PrepModal
        isOpen={prepModalOpen}
        onClose={() => {
          setPrepModalOpen(false);
          setSelectedBooking(null);
          setPrepPlan(null);
        }}
        plan={prepPlan}
      />
    </div>
  );
}
