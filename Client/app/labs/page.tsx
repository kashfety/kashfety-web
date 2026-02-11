"use client"

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, FileText, ArrowLeft, RefreshCw, Star, Download, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/providers/auth-provider";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { labService } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/components/providers/locale-provider";
import { toArabicNumerals, getCanonicalStatus } from "@/lib/i18n";
import LabResultModal from "@/components/LabResultModal";
import LabRescheduleModal from "@/components/LabRescheduleModal";
import LabCancelModal from "@/components/LabCancelModal";

interface LabBooking {
  id: string;
  booking_date: string;
  booking_time: string;
  status: string;
  duration?: number;
  notes?: string;
  fee?: number;
  center?: { id: string; name: string; name_ar?: string; address: string };
  type?: { id: string; name: string; name_ar?: string; name_ku?: string; category: string };
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
  const { t, locale, isRTL } = useLocale();
  const [bookings, setBookings] = useState<LabBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal states
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<LabBooking | null>(null);

  const toggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all'); // lab | imaging | all
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');

  // Helper functions for localized names
  const getLocalizedTestName = (booking: LabBooking) => {
    if (!booking.type) return t('unknown_test') || 'Unknown Test';

    if (locale === 'ar' && booking.type.name_ar) {
      return booking.type.name_ar;
    }
    // Kurdish locale not currently supported
    // if (locale === 'ku' && booking.type.name_ku) {
    //   return booking.type.name_ku;
    // }
    return booking.type.name || t('unknown_test') || 'Unknown Test';
  };

  const getLocalizedCenterName = (booking: LabBooking) => {
    if (!booking.center) return t('unknown_center') || 'Unknown Center';

    if (locale === 'ar' && booking.center.name_ar) {
      return booking.center.name_ar;
    }
    return booking.center.name || t('unknown_center') || 'Unknown Center';
  };

  const getLocalizedStatus = (status: string) => {
    const canonical = getCanonicalStatus(status || '');
    const statusKey = `appointments_status_${canonical}`;
    return t(statusKey) || (status || '').toUpperCase();
  };

  const isAbsent = (booking: LabBooking) => {
    if (booking.status !== 'scheduled' && booking.status !== 'confirmed') return false;

    try {
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
      const now = new Date();
      return bookingDateTime < now;
    } catch (e) {
      return false;
    }
  }

  const filtered = useMemo(() => {
    const statusOk = (b: LabBooking) => statusFilter === 'all' || (b.status || '').toLowerCase() === statusFilter;
    const catOk = (b: LabBooking) => categoryFilter === 'all' || (b.type?.category || '').toLowerCase() === categoryFilter;
    const toDate = (d: string) => { try { return new Date(d).setHours(0, 0, 0, 0); } catch { return NaN; } };
    const dateOk = (b: LabBooking) => {
      const d = toDate(b.booking_date);
      if (startDate) { const s = toDate(startDate); if (!isNaN(s) && d < s) return false; }
      if (endDate) { const e = toDate(endDate); if (!isNaN(e) && d > e) return false; }
      return true;
    };
    const q = searchText.trim().toLowerCase();
    const searchOk = (b: LabBooking) => {
      if (!q) return true;
      // Support searching in both English and Arabic names
      const testNameEn = (b.type?.name || '').toLowerCase();
      const testNameAr = (b.type?.name_ar || '').toLowerCase();
      const centerNameEn = (b.center?.name || '').toLowerCase();
      const centerNameAr = (b.center?.name_ar || '').toLowerCase();

      return testNameEn.includes(q) || testNameAr.includes(q) ||
        centerNameEn.includes(q) || centerNameAr.includes(q);
    };

    // Filter bookings
    const filteredBookings = bookings.filter(b => statusOk(b) && catOk(b) && dateOk(b) && searchOk(b));

    // Sort bookings with custom order: Scheduled -> Confirmed -> Cancelled -> Completed
    // Within each status group, sort by date:
    // - Scheduled/Confirmed: earliest first (ascending)
    // - Cancelled/Completed: latest first (descending)
    // Note: Absent bookings are treated as cancelled for sorting
    const statusOrder: Record<string, number> = {
      'scheduled': 1,
      'confirmed': 2,
      'cancelled': 3,
      'completed': 4
    }

    return filteredBookings.sort((a, b) => {
      const statusA = (a.status || '').toLowerCase()
      const statusB = (b.status || '').toLowerCase()

      // Treat absent bookings as cancelled for sorting
      const isAbsentA = isAbsent(a)
      const isAbsentB = isAbsent(b)

      // First, sort by status (absent treated as cancelled)
      const orderA = isAbsentA ? statusOrder['cancelled'] : (statusOrder[statusA] || 999)
      const orderB = isAbsentB ? statusOrder['cancelled'] : (statusOrder[statusB] || 999)

      if (orderA !== orderB) {
        return orderA - orderB
      }

      // Within same status, sort by date
      const dateA = new Date(a.booking_date + 'T' + a.booking_time).getTime()
      const dateB = new Date(b.booking_date + 'T' + b.booking_time).getTime()

      // For scheduled and confirmed appointments (that are not absent), show earliest first (ascending)
      // For cancelled, completed, and absent appointments, show latest first (descending)
      if ((statusA === 'scheduled' || statusA === 'confirmed') && !isAbsentA) {
        return dateA - dateB // Ascending order (earliest first)
      } else {
        return dateB - dateA // Descending order (latest first)
      }
    })
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
  const handleViewResult = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setResultModalOpen(true);
  };

  const handleReschedule = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setRescheduleModalOpen(true);
  };

  const handleCancel = (booking: LabBooking) => {
    setSelectedBooking(booking);
    setCancelModalOpen(true);
  };

  const handleRescheduleSuccess = () => {
    setRescheduleModalOpen(false);
    setSelectedBooking(null);
    refresh();
  };

  const handleCancelSuccess = () => {
    setCancelModalOpen(false);
    setSelectedBooking(null);
    refresh();
  };

  // Remove the convertToAppointment function as we're using lab-specific modals now

  useEffect(() => { document.title = `${t('labTestsTitle') || 'Laboratory Tests & Medical Imaging'} | ${t('app_name') || 'Kashfety'}`; }, [t]);
  useEffect(() => { if (user && !loading) refresh(); }, [user, loading, locale]);
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
    <div className={`min-h-screen bg-background ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content - No transform, sidebar overlays on top */}
      <div onClick={() => sidebarOpen && toggleSidebar()}>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Header onMenuToggle={toggleSidebar} />
        </div>
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" size="sm" onClick={() => router.push('/')} className="flex items-center gap-2 border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
                <ArrowLeft size={16} /> {t('appointments_back_home') || 'Back to Home'}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">{t('my_labs_title') || 'My Lab Tests & Scans'}</h1>
                <p className="text-muted-foreground mt-1">{t('my_labs_subtitle') || t('labs_subtitle') || 'View and manage your lab test and imaging bookings'}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={refresh} variant="outline" className="flex items-center gap-2 border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20">
                  <RefreshCw size={16} /> {t('appointments_refresh') || 'Refresh'}
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
                  <label className="block text-xs text-muted-foreground mb-1">{t('type') || (locale === 'ar' ? 'النوع' : 'Type')}</label>
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
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} lang={locale} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">{t('appointments_to_label') || 'To'}</label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} lang={locale} />
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
                <p className="text-muted-foreground mb-6">{t('no_labs_desc') || "You haven't booked any lab tests yet."}</p>
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
                          {getLocalizedTestName(booking)}
                          {booking.rating && (
                            <div className="flex items-center gap-1 ml-2">
                              <Star size={16} className="text-yellow-500 fill-current" />
                              <span className="text-sm text-yellow-600">{toArabicNumerals(booking.rating, locale)}</span>
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
                            <span className="text-xs text-green-600 ml-1">{t('results') || 'Results'}</span>
                          </div>
                        )}
                        <Badge className={`${getStatusColor(booking.status)} border`}>{getLocalizedStatus(booking.status)}</Badge>
                        {isAbsent(booking) && (
                          <Badge variant="destructive" className="text-xs bg-red-100 text-red-800 border-red-200 hover:bg-red-100">{t('appointments_absent_badge') || 'Absent'}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Calendar className="w-5 h-5 text-emerald-600" />
                          <div>
                            <div className="font-medium">{toArabicNumerals(new Date(booking.booking_date).toLocaleDateString(locale || 'en-US', { year: 'numeric', month: 'long', day: 'numeric' }), locale)}</div>
                            <div className="text-sm text-gray-500">{t('appointments_date_label') || 'Date'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <Clock className="w-5 h-5 text-emerald-600" />
                          <div>
                            <div className="font-medium">{toArabicNumerals((() => { try { const [h, m] = (booking.booking_time || '').split(':'); const t2 = new Date(); t2.setHours(parseInt(h), parseInt(m), 0); return t2.toLocaleTimeString(locale || 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true }); } catch { return booking.booking_time; } })(), locale)} ({toArabicNumerals(booking.duration || 30, locale)} {t('minutes_short') || 'min'})</div>
                            <div className="text-sm text-gray-500">{t('appointments_duration_label') || 'Duration'}</div>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-muted-foreground">
                          <MapPin className="w-5 h-5 text-emerald-600 mt-0.5" />
                          <div>
                            <div className="font-medium">{getLocalizedCenterName(booking)}</div>
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
                          <div className="flex gap-2 flex-wrap">
                            {booking.status === 'completed' && booking.result_file_url && (
                              <Button
                                size="sm"
                                onClick={() => handleViewResult(booking)}
                                className="bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90 text-white"
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {t('view_results') || 'View Results'}
                              </Button>
                            )}

                            {booking.result_file_url && (
                              <Button
                                size="sm"
                                onClick={() => window.open(booking.result_file_url!, '_blank')}
                                variant="outline"
                                className="border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]/20"
                              >
                                <Download className="w-4 h-4 mr-2" />
                                {t('download_results') || 'Download PDF'}
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

        {/* Lab Result Modal */}
        <LabResultModal
          isOpen={resultModalOpen}
          onClose={() => {
            setResultModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
        />

        {/* Lab Reschedule Modal */}
        <LabRescheduleModal
          isOpen={rescheduleModalOpen}
          onClose={() => {
            setRescheduleModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          onSuccess={handleRescheduleSuccess}
        />

        {/* Lab Cancel Modal */}
        <LabCancelModal
          isOpen={cancelModalOpen}
          onClose={() => {
            setCancelModalOpen(false);
            setSelectedBooking(null);
          }}
          booking={selectedBooking}
          onSuccess={handleCancelSuccess}
        />

        {/* Close main content wrapper */}
      </div>
    </div>
  );
}
