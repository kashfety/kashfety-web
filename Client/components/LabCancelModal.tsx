"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, AlertTriangle, X } from "lucide-react";
import { labService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import CustomAlert from "@/components/CustomAlert";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from '@/components/providers/locale-provider';

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

interface LabCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: LabBooking | null;
  onSuccess: () => void;
}

export default function LabCancelModal({ isOpen, onClose, booking, onSuccess }: LabCancelModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLocale();
  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError } = useCustomAlert();

  const handleCancel = async () => {
    if (!booking) return;

    setLoading(true);
    try {
      console.log('Cancelling lab booking:', {
        bookingId: booking.id,
        reason
      });

      await labService.cancel(booking.id);

      showSuccess(
        t('lab_cancel_success_title') || "Cancellation Successful!",
        t('lab_cancel_success_message') || "Your lab test has been successfully cancelled.",
        () => {
          onSuccess();
          onClose();
        }
      );
    } catch (error: any) {
      console.error('Error cancelling lab booking:', error);
      showError(
        t('lab_cancel_error_title') || "Cancellation Failed",
        error.message || t('lab_cancel_error_message') || "Unable to cancel your lab test. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  if (!booking) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <Dialog open={isOpen} onOpenChange={handleClose}>
          <DialogContent className="max-w-md">
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
                <DialogTitle className="text-xl font-bold text-center flex items-center justify-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                  {t('cancel_lab_title') || 'Cancel Lab Test'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-6">
                {/* Booking Details */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3">
                                        {t("lab_booking_to_cancel") || "Lab Test to Cancel"}
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-red-600" />
                      <span className="font-medium text-red-900">{booking.type?.name}</span>
                      <Badge className="bg-red-100 text-red-800 text-xs">
                        {booking.type?.category?.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      <span className="text-red-900">{new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      <span className="text-red-900">{booking.center?.name}</span>
                    </div>
                    {booking.fee && (
                      <div className="text-red-700 font-medium">
                        Fee: ${booking.fee}
                      </div>
                    )}
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div className="text-yellow-800">
                      <p className="font-medium text-sm">
                                                {t("lab_cancel_warning_title") || "Cancellation Policy"}
                      </p>
                      <p className="text-xs mt-1">
                        {t('cancel_warning_message') || 'Cancellations within 24 hours of the appointment may incur a fee. Please review our cancellation policy.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Reason Input */}
                <div>
                  <Label htmlFor="reason" className="text-base font-medium">
                    {t('lab_cancel_reason') || 'Reason for Cancellation (Optional)'}
                  </Label>
                  <Textarea
                    id="reason"
                    placeholder={t('lab_cancel_reason_placeholder') || 'Please provide a reason for cancellation...'}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="mt-2"
                    rows={3}
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t('lab_cancel_reason_help') || 'This helps us improve our service and process your cancellation faster.'}
                  </p>
                </div>

                {/* Confirmation */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 text-center">
                    {t('lab_cancel_confirmation') || 'Are you sure you want to cancel this lab test? This action cannot be undone.'}
                  </p>
                </div>
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button variant="outline" onClick={handleClose} disabled={loading}>
                  {t('lab_keep_booking') || 'Keep Booking'}
                </Button>
                <Button 
                  onClick={handleCancel} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {t('lab_cancelling') || 'Cancelling...'}
                    </div>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      {t('lab_confirm_cancel') || 'Yes, Cancel Test'}
                    </>
                  )}
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