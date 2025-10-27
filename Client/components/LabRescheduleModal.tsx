"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, AlertCircle, MapPin } from "lucide-react";
import { labService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import CustomAlert from "@/components/CustomAlert";
import { motion, AnimatePresence } from "framer-motion"
import { useLocale } from "@/components/providers/locale-provider";

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
}

interface LabRescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: LabBooking | null;
  onSuccess: () => void;
}

export default function LabRescheduleModal({ isOpen, onClose, booking, onSuccess }: LabRescheduleModalProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError } = useCustomAlert();
  
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Array<{time: string, is_available: boolean, is_booked: boolean}>>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);

  // Reset form when booking changes
  useEffect(() => {
    if (booking && isOpen) {
      setSelectedDate(undefined);
      setSelectedTime("");
      setReason("");
      setAvailableSlots([]);
      setAvailableDates([]);
      
      // Fetch available dates for this lab type and center
      fetchAvailableDates();
    }
  }, [booking, isOpen]);

  const fetchAvailableDates = async () => {
    if (!booking?.center?.id || !booking?.type?.id) return;
    
    try {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      
      const res = await labService.getAvailableDates(booking.center.id, booking.type.id, { 
        start_date: fmt(startDate), 
        end_date: fmt(endDate) 
      });
      
      const dates = (res as any)?.available_dates || (res as any)?.data?.available_dates || [];
      setAvailableDates(dates.map((d: any) => d.date || d));
    } catch (e) {
      console.error('Error fetching lab available dates:', e);
      setAvailableDates([]);
    }
  };

  const fetchAvailableSlots = async (date: Date) => {
    if (!booking?.center?.id || !booking?.type?.id) return;

    setLoadingAvailability(true);
    try {
      const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dateString = fmt(date);
      
      const res = await labService.getAvailableSlots(booking.center.id, booking.type.id, dateString);
      const data = (res as any)?.data || res;
      
      const availableSlots = data?.available_slots || [];
      setAvailableSlots(availableSlots.map((slot: any) => ({
        time: slot.time,
        is_available: slot.is_available,
        is_booked: !slot.is_available
      })));
    } catch (e) {
      console.error('Error fetching lab available slots:', e);
      setAvailableSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");
    if (date) {
      fetchAvailableSlots(date);
    }
  };

  const handleReschedule = async () => {
    if (!booking || !selectedDate || !selectedTime) return;

    setLoading(true);
    try {
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const dateString = formatDateForAPI(selectedDate);
      
      await labService.reschedule(booking.id, dateString, selectedTime);
      
      showSuccess(
        t('reschedule_success_title') || "Reschedule Successful!",
        t('reschedule_success_message') || "Your lab test has been successfully rescheduled.",
        () => {
          onSuccess();
          onClose();
        }
      );
    } catch (error: any) {
      console.error('Error rescheduling lab booking:', error);
      showError(
        t('reschedule_error_title') || "Reschedule Failed",
        error.message || t('reschedule_error_message') || "Unable to reschedule your lab test. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDate(undefined);
    setSelectedTime("");
    setReason("");
    setAvailableSlots([]);
    setAvailableDates([]);
    onClose();
  };

  if (!booking) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 50 }}
              transition={{ 
                type: "spring",
                duration: 0.5,
                bounce: 0.3
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-center">
                  {t('reschedule_lab_title') || 'Reschedule Lab Test'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-6">
                {/* Current Booking Info */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      {t('lab_current_booking') || 'Current Booking'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-blue-600" />
                        <span>{booking.type?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>{new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span>{booking.center?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-blue-100 text-blue-800">
                          {booking.status?.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Calendar */}
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">
                      {t('lab_select_new_date') || 'Select New Date'}
                    </Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => {
                        // Disable past dates
                        if (date < new Date()) return true;
                        
                        // Only enable dates returned by lab schedule
                        const d = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                        return !availableDates.includes(d);
                      }}
                      className="rounded-md border"
                    />
                  </div>

                  {/* Time Slots */}
                  <div>
                    <Label className="text-lg font-semibold mb-4 block">
                      {t('lab_select_new_time') || 'Select New Time'}
                    </Label>
                    {selectedDate ? (
                      loadingAvailability ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600"></div>
                          <span className="ml-2 text-sm">{t('lab_loading_times') || 'Loading available times...'}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                          {availableSlots.map((slot, index) => (
                            <motion.div
                              key={slot.time}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.03 }}
                              whileHover={slot.is_available && !slot.is_booked ? { scale: 1.05 } : {}}
                            >
                              <Button
                                variant={selectedTime === slot.time ? "default" : "outline"}
                                size="sm"
                                onClick={() => setSelectedTime(slot.time)}
                                disabled={slot.is_booked || !slot.is_available}
                                className={`w-full ${
                                  slot.is_booked || !slot.is_available
                                    ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                                    : selectedTime === slot.time
                                    ? "bg-emerald-600 hover:bg-emerald-700"
                                    : "hover:bg-emerald-50"
                                }`}
                              >
                                {slot.time}
                                {slot.is_booked && (
                                  <span className="ml-1 text-xs">(Booked)</span>
                                )}
                              </Button>
                            </motion.div>
                          ))}
                          {availableSlots.length === 0 && (
                            <div className="col-span-3 text-center py-4 text-gray-500">
                              {t('lab_no_times_available') || 'No available time slots for this date'}
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <p className="text-gray-500 text-center py-8">
                        {t('lab_select_date_first') || 'Please select a date first'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <Label htmlFor="reason" className="text-base font-medium">
                    {t('lab_reschedule_reason') || 'Reason for Rescheduling (Optional)'}
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder={t('lab_reschedule_reason_placeholder') || 'Please provide a reason for rescheduling...'}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                </div>

                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-yellow-800">
                      <p className="font-medium">
                        {t('lab_reschedule_warning_title') || 'Important Notice'}
                      </p>
                      <p className="text-sm mt-1">
                        {t('lab_reschedule_warning_message') || 'Please reschedule at least 24 hours before your appointment to avoid cancellation fees.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button 
                  onClick={handleReschedule} 
                  disabled={!selectedDate || !selectedTime || loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {loading ? (t('lab_rescheduling') || 'Rescheduling...') : (t('lab_confirm_reschedule') || 'Confirm Reschedule')}
                </Button>
              </DialogFooter>
            </motion.div>
          </DialogContent>

          {/* Custom Alert Dialog */}
          {alertConfig && (
            <CustomAlert
              isOpen={alertOpen}
              onClose={hideAlert}
              title={alertConfig.title}
              message={alertConfig.message}
              type={alertConfig.type}
              confirmText={alertConfig.confirmText}
              onConfirm={alertConfig.onConfirm}
              showCancel={alertConfig.showCancel}
              cancelText={alertConfig.cancelText}
            />
          )}
        </Dialog>
      )}
    </AnimatePresence>
  );
}