"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, AlertTriangle, X } from "lucide-react";
import { appointmentService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from '@/components/providers/locale-provider';

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  status: string;
  location: string;
  address: string;
  phone: string;
  notes: string;
  isHomeVisit: boolean;
}

interface CancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: () => void;
}

export default function CancelModal({ isOpen, onClose, appointment, onSuccess }: CancelModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t, isRTL, locale } = useLocale();

  // Check if cancellation is within 24 hours
  const canCancel = () => {
    if (!appointment?.date || !appointment?.time) return true; // Allow if date/time missing

    try {
      // Parse the formatted date and time
      // Date format: "November 25, 2025"
      // Time format: "3:30 PM"
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);

      // Check if date is valid
      if (isNaN(appointmentDateTime.getTime())) {
        console.error('❌ [CancelModal] Invalid date format:', { date: appointment.date, time: appointment.time });
        return true; // Allow cancellation if we can't parse the date
      }

      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      console.log('🔍 [CancelModal] Can cancel check:', {
        date: appointment.date,
        time: appointment.time,
        parsedDateTime: appointmentDateTime.toISOString(),
        now: now.toISOString(),
        hoursUntilAppointment: hoursUntilAppointment.toFixed(2),
        canCancel: hoursUntilAppointment >= 24
      });

      // Can cancel if 24 hours or more away (not if appointment is in the past)
      return hoursUntilAppointment >= 24;
    } catch (error) {
      console.error('❌ [CancelModal] Error parsing date:', error);
      return true; // Allow cancellation if parsing fails
    }
  };

  const getTimeUntilAppointment = () => {
    if (!appointment?.date || !appointment?.time) return null;

    try {
      // Parse the formatted date and time
      const appointmentDateTime = new Date(`${appointment.date} ${appointment.time}`);

      // Check if date is valid
      if (isNaN(appointmentDateTime.getTime())) {
        return null;
      }

      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 0) {
        return Math.ceil(hoursUntilAppointment);
      }
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleCancel = async () => {
    if (!appointment) return;

    setLoading(true);
    try {
      console.log('Cancelling appointment:', {
        appointmentId: appointment.id,
        reason
      });

      await appointmentService.cancelAppointment(appointment.id, reason);

      toast({
        title: t('cancel_appointment_success_title') || "Appointment Cancelled",
        description: t('cancel_appointment_success_desc') || "Your appointment has been cancelled successfully.",
      });

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error cancelling appointment:', error);
      let errorMessage = t('cancel_appointment_error') || "Failed to cancel appointment. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: t('error') || "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!appointment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`max-w-md ${isRTL ? 'rtl' : 'ltr'}`}>
        <DialogHeader className={isRTL ? 'text-right' : 'text-left'}>
          <DialogTitle className={`text-xl font-bold text-red-600 dark:text-red-400 flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : 'flex-row'}`}>
            <X className="w-5 h-5" />
            {t('cancel_appointment') || 'Cancel Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 24-hour restriction warning */}
          {!canCancel() && (
            <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-400 dark:border-red-500 rounded-lg p-4">
              <div className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : 'flex-row'}`}>
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-900 dark:text-red-100">
                  <p className="font-bold mb-1">{t('cancel_24h_restriction_title') || 'Cancellation Not Allowed'}</p>
                  <p>
                    {t('cancel_24h_restriction_message') || `You cannot cancel this appointment as it is scheduled within the next ${getTimeUntilAppointment()} hours. Please contact support for assistance.`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          {canCancel() && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div className="text-sm text-red-800 dark:text-red-200">
                  <p className="font-medium">{t('cancel_confirmation') || 'Are you sure?'}</p>
                  <p>{t('cancel_warning') || 'This action cannot be undone. Your appointment will be cancelled immediately.'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Appointment Details */}
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('appointment_details') || 'Appointment Details'}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Dr. {appointment.doctorName}</span>
                <Badge variant="outline" className="text-xs">{appointment.specialty}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-gray-900 dark:text-gray-100">{appointment.date} {t('at') || 'at'} {appointment.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-gray-900 dark:text-gray-100">{appointment.duration}</span>
              </div>
            </div>
          </div>

          {/* Reason for Cancellation */}
          <div>
            <Label htmlFor="cancel-reason" className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {t('cancel_reason_label') || 'Reason for Cancellation (Optional)'}
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder={t('cancel_reason_placeholder') || 'Please provide a reason for cancellation...'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            {t('keep_appointment') || 'Keep Appointment'}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={loading || !canCancel()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (t('cancelling') || 'Cancelling...') : (t('cancel_appointment') || 'Cancel Appointment')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 