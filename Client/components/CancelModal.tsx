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
  const { t } = useLocale();

  // Check if cancellation is within 24 hours
  const canCancel = () => {
    if (!appointment?.date || !appointment?.time) return true; // Allow if date/time missing
    
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Can cancel if more than 24 hours away, or if appointment is in the past (though API will block past)
    return hoursUntilAppointment > 24 || hoursUntilAppointment < 0;
  };

  const getTimeUntilAppointment = () => {
    if (!appointment?.date || !appointment?.time) return null;
    
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 0) {
      return Math.ceil(hoursUntilAppointment);
    }
    return null;
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
            <X className="w-5 h-5" />
            {t('cancel_appointment') || 'Cancel Appointment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 24-hour restriction warning */}
          {!canCancel() && (
            <div className="bg-red-100 border-2 border-red-400 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-900">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">{t('cancel_confirmation') || 'Are you sure?'}</p>
                  <p>{t('cancel_warning') || 'This action cannot be undone. Your appointment will be cancelled immediately.'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Appointment Details */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">{t('appointment_details') || 'Appointment Details'}</h3>
            <div className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Dr. {appointment.doctorName}</span>
                <Badge variant="outline" className="text-xs">{appointment.specialty}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>{appointment.date} at {appointment.time}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>{appointment.duration} {t('appointment') || 'appointment'}</span>
              </div>
            </div>
          </div>

          {/* Reason for Cancellation */}
          <div>
            <Label htmlFor="cancel-reason" className="text-sm font-medium">
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