"use client"

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock, User, AlertCircle, MapPin } from "lucide-react";
import { appointmentService } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useCustomAlert } from "@/hooks/use-custom-alert";
import CustomAlert from "@/components/CustomAlert";
import { motion, AnimatePresence } from "framer-motion"
import { useLocale } from "@/components/providers/locale-provider";

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
  appointment_date: string;
  appointment_time: string;
  doctor_id?: string;
}

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: () => void;
  onReschedule?: (updatedAppointment: Appointment) => void;
}

export default function RescheduleModal({ isOpen, onClose, appointment, onSuccess, onReschedule }: RescheduleModalProps) {
  const { t, isRTL, locale } = useLocale();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  // Enhanced state for comprehensive schedule handling (like BookingModal)
  const [availableSlots, setAvailableSlots] = useState<Array<{ time: string, is_available: boolean, is_booked: boolean }>>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [doctorWorkingDays, setDoctorWorkingDays] = useState<number[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [actualConsultationFee, setActualConsultationFee] = useState<number>(0);

  const { toast } = useToast();
  const { alertConfig, isOpen: alertOpen, hideAlert, showSuccess, showError } = useCustomAlert();

  useEffect(() => {
    if (isOpen && appointment) {
      // Reset form when modal opens
      setSelectedDate(undefined);
      setSelectedTime("");
      setReason("");
      setAvailableSlots([]);
      setBookedSlots([]);

      // Fetch doctor's working days and available dates when modal opens
      // Try to get doctor_id from various possible locations
      const doctorId = appointment.doctor_id || (appointment as any)?.doctor?.id || (appointment as any)?.doctor_id;

      if (doctorId) {
        console.log('📅 RescheduleModal - Fetching availability for doctor_id:', doctorId);
        fetchDoctorAvailability(doctorId);
      } else {
        console.error('❌ RescheduleModal - No doctor_id found in appointment:', appointment);
      }
    }
  }, [isOpen, appointment]);

  // Enhanced doctor availability fetching (from BookingModal)
  const fetchDoctorAvailability = async (doctorId: string) => {
    try {
      console.log('🔍 Fetching doctor availability for reschedule:', doctorId);

      // Calculate date range for next 30 days
      const today = new Date();
      const startDate = today.toISOString().split('T')[0];
      const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Get center_id if available
      const maybeCenterId = (appointment as any)?.center_id;

      // Try multiple route variants for Vercel compatibility (same as BookingModal)
      const params = new URLSearchParams();
      params.set('doctorId', doctorId);
      if (maybeCenterId) {
        params.set('center_id', maybeCenterId);
      }

      const routes = [
        `/api/doctor-working-days?${params.toString()}`,
        `/api/doctor-schedule/${doctorId}/working-days${maybeCenterId ? `?center_id=${maybeCenterId}` : ''}`
      ];

      let result = null;
      for (let i = 0; i < routes.length; i++) {
        try {
          console.log(`📅 Trying route ${i + 1}/${routes.length}: ${routes[i]}`);
          const response = await fetch(routes[i]);
          if (response.ok) {
            result = await response.json();
            console.log('✅ Route worked:', routes[i]);
            break;
          }
          console.log(`❌ Route failed: ${routes[i]}, status: ${response.status}`);
        } catch (error) {
          console.log(`❌ Route error: ${routes[i]}`, error);
          if (i === routes.length - 1) {
            throw error; // Rethrow on last attempt
          }
        }
      }

      if (!result) {
        throw new Error('All routes failed');
      }

      // Accept either working_days or workingDays key
      const rawDays = Array.isArray(result.working_days) ? result.working_days : (Array.isArray(result.workingDays) ? result.workingDays : null);
      if (result.success && Array.isArray(rawDays)) {
        console.log('📅 Doctor working days data:', result);
        // Normalize to numbers
        const workingDays = rawDays.map((d: any) => Number(d)) || [1, 2, 3, 4, 5];
        setDoctorWorkingDays(workingDays);
        console.log('📅 Doctor working days:', workingDays);

        // Generate available dates for the next 30 days based on working days
        const availableDates = [];
        const today = new Date();

        for (let i = 0; i < 30; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          const dayOfWeek = date.getDay();

          if (workingDays.includes(dayOfWeek)) {
            availableDates.push(date.toISOString().split('T')[0]);
          }
        }

        // Set available dates from generated list
        setAvailableDates(availableDates);
        console.log('📅 Available dates for reschedule:', availableDates);
      } else {
        console.log('❌ Failed to get availability data:', result.message);
        // Use safe fallback on error
        setAvailableDates([]);
        setDoctorWorkingDays([1, 2, 3, 4, 5]); // Monday to Friday as fallback
      }
    } catch (error) {
      console.error('Error fetching doctor availability:', error);
      // Use safe fallback on any error
      setAvailableDates([]);
      setDoctorWorkingDays([1, 2, 3, 4, 5]); // Monday to Friday as fallback
    }
  };

  // Enhanced available slots fetching (from BookingModal)
  const fetchAvailableSlots = async (doctorId: string, date: Date) => {
    setLoadingAvailability(true);
    try {
      // Format date in local timezone to prevent date shift
      const formatDateForAPI = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const dateString = formatDateForAPI(date);
      const appointmentType = appointment?.isHomeVisit ? "home_visit" : "clinic";

      console.log('🔍 Fetching available slots for reschedule - Doctor:', doctorId, 'Date:', dateString, 'Type:', appointmentType);

      // Get center_id if available
      const maybeCenterId = (appointment as any)?.center_id;

      // Build query parameters for fallback route
      const params = new URLSearchParams();
      params.set('doctorId', doctorId);
      params.set('date', dateString);
      params.set('appointment_type', appointmentType);
      if (maybeCenterId) {
        params.set('center_id', maybeCenterId);
      }
      if (appointment?.id) {
        params.set('exclude_appointment_id', appointment.id);
      }

      // Try multiple route variants for Vercel compatibility (same pattern as working-days)
      const routes = [
        `/api/doctor-available-slots?${params.toString()}`,
        `/api/doctor-schedule/${doctorId}/available-slots?date=${dateString}${maybeCenterId ? `&center_id=${maybeCenterId}` : ''}&appointment_type=${appointmentType}${appointment?.id ? `&exclude_appointment_id=${encodeURIComponent(appointment.id)}` : ''}`
      ];

      let result = null;
      for (let i = 0; i < routes.length; i++) {
        try {
          console.log(`🕐 Trying route ${i + 1}/${routes.length}: ${routes[i]}`);
          const response = await fetch(routes[i], {
            headers: {
              'Content-Type': 'application/json',
            }
          });
          if (response.ok) {
            result = await response.json();
            console.log('✅ Route worked:', routes[i]);
            break;
          }
          console.log(`❌ Route failed: ${routes[i]}, status: ${response.status}`);
        } catch (error) {
          console.log(`❌ Route error: ${routes[i]}`, error);
          if (i === routes.length - 1) {
            throw error; // Rethrow on last attempt
          }
        }
      }

      if (!result) {
        throw new Error('All routes failed');
      }

      // Handle different response formats
      const slots = result.available_slots || result.slots || [];
      const bookedSlotsList = result.booked_slots || [];

      console.log('📅 RESCHEDULE MODAL - Available slots from API:', slots);
      console.log('📅 RESCHEDULE MODAL - Slot structure:', slots[0]);

      // Normalize slots to expected format
      const normalizedSlots = slots.map((slot: any) => {
        if (typeof slot === 'string') {
          return {
            time: slot,
            is_available: true,
            is_booked: false
          };
        }
        return {
          time: slot.time || slot.start_time || slot.slot_time,
          is_available: slot.is_available !== false,
          is_booked: slot.is_booked === true || slot.is_booked === false ? slot.is_booked : false
        };
      }).filter((slot: any) => slot.time);

      console.log('📅 RESCHEDULE MODAL - Final normalized slots:', normalizedSlots);

      setAvailableSlots(normalizedSlots);
      setBookedSlots(bookedSlotsList);
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
      setBookedSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime("");

    if (date) {
      // Try to get doctor_id from various possible locations
      const doctorId = appointment?.doctor_id || (appointment as any)?.doctor?.id || (appointment as any)?.doctor_id;

      if (doctorId) {
        console.log('📅 RescheduleModal - Using doctor_id:', doctorId, 'for date:', date);
        await fetchAvailableSlots(doctorId, date);
      } else {
        console.error('❌ RescheduleModal - No doctor_id found in appointment:', appointment);
        showError(
          t('reschedule_error_title') || "Error",
          t('reschedule_error_no_doctor') || "Unable to find doctor information. Please try again."
        );
        setAvailableSlots([]);
      }
    } else {
      setAvailableSlots([]);
    }
  };

  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTime) {
      showError(
        t('reschedule_missing_info_title') || "Missing Information",
        t('reschedule_missing_info_message') || "Please select a date and time for rescheduling."
      );
      return;
    }

    setLoading(true);

    // Helper function for date formatting
    const formatDateForAPI = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    try {
      // ENHANCED: Pre-reschedule validation - check if the slot is still available
      console.log('🔍 Performing pre-reschedule slot validation...');
      const dateString = formatDateForAPI(selectedDate);
      const maybeCenterId2 = (appointment as any)?.center_id;

      // Build validation URL with fallback pattern (try multiple routes)
      const validationParams = new URLSearchParams();
      if (appointment.doctor_id) validationParams.set('doctorId', appointment.doctor_id);
      validationParams.set('date', dateString);
      validationParams.set('appointment_type', (appointment as any)?.appointment_type || 'clinic');
      if (maybeCenterId2) {
        validationParams.set('center_id', maybeCenterId2);
      }
      if (appointment?.id) {
        validationParams.set('exclude_appointment_id', appointment.id);
      }

      // Try fallback route first (this one works according to logs)
      const validationUrls = [
        `/api/doctor-available-slots?${validationParams.toString()}`,
        `/api/doctor-schedule/${appointment.doctor_id}/available-slots?${validationParams.toString()}`
      ];

      let validationResult: any = null;
      let validationSuccess = false;

      for (const url of validationUrls) {
        try {
          console.log('🕐 Trying validation route:', url);
          const validationResponse = await fetch(url);
          if (validationResponse.ok) {
            validationResult = await validationResponse.json();
            validationSuccess = true;
            console.log('✅ Validation route worked:', url);
            break;
          }
        } catch (err) {
          console.log('❌ Validation route failed:', url);
          continue;
        }
      }

      if (!validationSuccess || !validationResult) {
        console.warn('⚠️ Could not validate slot availability, proceeding with reschedule...');
      } else if (validationResult.success && validationResult.available_slots) {
        const availableSlotTimes = validationResult.available_slots
          .filter((slot: any) => slot.is_available && !slot.is_booked)
          .map((slot: any) => slot.time);

        console.log('🔍 Current available slots:', availableSlotTimes);
        console.log('🔍 Selected time:', selectedTime);

        if (!availableSlotTimes.includes(selectedTime)) {
          console.error('❌ Selected slot is no longer available for reschedule');
          showError(
            t('reschedule_slot_unavailable_title') || "Slot No Longer Available",
            t('reschedule_slot_unavailable_message') || "Sorry, this time slot was just booked by another patient. Please select a different time.",
            () => {
              // Refresh available slots
              if (appointment?.doctor_id) {
                fetchAvailableSlots(appointment.doctor_id, selectedDate);
              }
              setSelectedTime(""); // Clear the invalid selection
            }
          );
          setLoading(false);
          return;
        }

        console.log('✅ Pre-reschedule validation passed - slot is still available');
      } else {
        console.warn('⚠️ Could not validate slot availability, proceeding with reschedule...');
      }

      // Prepare reschedule data
      const rescheduleData = {
        appointment_date: formatDateForAPI(selectedDate), // Fixed timezone issue
        appointment_time: selectedTime,
        reason: reason || t('reschedule_default_reason') || "Rescheduled by patient request"
      };

      // DEBUG: Log date formatting fix
      console.log('🔍 RESCHEDULE DATE FIX DEBUG - Selected date object:', selectedDate);
      console.log('🔍 RESCHEDULE DATE FIX DEBUG - Formatted for API:', formatDateForAPI(selectedDate));
      console.log('🔍 RESCHEDULE DATE FIX DEBUG - Old method would give:', selectedDate.toISOString().split('T')[0]);

      console.log('Rescheduling appointment:', {
        appointmentId: appointment.id,
        appointmentData: appointment,
        rescheduleData
      });

      await appointmentService.rescheduleAppointment(appointment.id, rescheduleData);

      // Create updated appointment object for parent component
      const updatedAppointment: Appointment = {
        ...appointment,
        date: formatDateForAPI(selectedDate),
        time: selectedTime,
        appointment_date: formatDateForAPI(selectedDate),
        appointment_time: selectedTime,
        status: 'rescheduled' // Update status to reflect the change
      };

      // Immediately update parent and close the modal
      if (onReschedule) {
        onReschedule(updatedAppointment);
      }
      onSuccess();
      onClose();
      // Show a non-blocking toast confirmation
      toast({
        title: t('reschedule_success_title') || "Appointment Rescheduled",
        description: t('reschedule_success_message') || "Your appointment was rescheduled successfully."
      });
    } catch (error: any) {
      console.error('Error rescheduling appointment:', error);
      let errorMessage = t('reschedule_error_default') || "Failed to reschedule appointment. Please try again.";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(
        t('reschedule_error_title') || "Error",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  // Helper function to check if a date should be disabled
  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Disable past dates
    if (date < today) return true;

    // If we have available dates from API, use those (more accurate)
    if (availableDates.length > 0) {
      const dateString = date.toISOString().split('T')[0];
      return !availableDates.includes(dateString);
    }

    // Otherwise, disable if not in doctor's working days
    if (doctorWorkingDays.length > 0 && !doctorWorkingDays.includes(date.getDay())) {
      return true;
    }

    return false;
  };

  if (!appointment) return null;

  return (
    <>
      <CustomAlert
        isOpen={alertOpen}
        onClose={hideAlert}
        title={alertConfig?.title || ""}
        message={alertConfig?.message || ""}
        type={alertConfig?.type || "info"}
      />

      <AnimatePresence>
        {isOpen && (
          <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={`max-w-2xl max-h-[90vh] overflow-hidden border-2 border-[#4DBCC4]/20 dark:border-[#4DBCC4]/40 p-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 shadow-2xl ${isRTL ? 'rtl' : 'ltr'}`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                className="max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-900"
              >
                <div className="space-y-6 p-6">
                  {/* Header Section - Matching BookingModal */}
                  <div className={`flex items-center justify-between gap-3 flex-wrap bg-gradient-to-r from-[#4DBCC4]/10 to-[#3da8b0]/10 dark:from-[#4DBCC4]/20 dark:to-[#3da8b0]/20 p-5 rounded-lg border-l-4 border-[#4DBCC4] shadow-sm ${isRTL ? 'border-r-4 border-l-0 flex-row-reverse text-right' : 'border-l-4'}`}>
                    <div className={isRTL ? 'text-right' : 'text-left'}>
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reschedule_title') || 'Reschedule Appointment'}</h3>
                      <p className="text-base text-gray-700 dark:text-gray-300 mt-2">
                        {t('reschedule_with') || 'with'} {appointment.doctorName || t('reschedule_doctor_label') || 'Doctor'}
                      </p>
                    </div>
                  </div>

                  {/* Current Appointment Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 border-2 border-blue-200 dark:border-blue-800 shadow-md">
                      <CardContent className="p-4">
                        <motion.h3
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          {t('reschedule_current_appointment') || 'Current Appointment'}
                        </motion.h3>
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4, staggerChildren: 0.1 }}
                          className="space-y-2"
                        >
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-gray-900 dark:text-gray-100">{appointment.doctorName || t('reschedule_doctor_label') || 'Doctor'}</span>
                            {appointment.specialty && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                              >
                                <Badge variant="outline" className="text-xs text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800">{appointment.specialty}</Badge>
                              </motion.div>
                            )}
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2"
                          >
                            <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-gray-900 dark:text-gray-100">
                              {appointment.appointment_date || appointment.date || t('reschedule_date_tbd') || 'Date TBD'} {t('reschedule_at') || 'at'}{' '}
                              {appointment.appointment_time?.substring(0, 5) || appointment.time || t('reschedule_time_tbd') || 'Time TBD'}
                            </span>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex items-center gap-2"
                          >
                            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-gray-900 dark:text-gray-100">
                              {appointment.duration ? `${appointment.duration} ${t('reschedule_min') || 'min'}` : `30 ${t('reschedule_min') || 'min'}`} - {appointment.type || t('reschedule_consultation') || 'Consultation'}
                            </span>
                          </motion.div>
                          <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-gray-900 dark:text-gray-100">{appointment.location || appointment.address || t('reschedule_medical_center') || 'Medical Center'}</span>
                          </motion.div>
                          {appointment.phone && (
                            <motion.div
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-4 h-4 text-blue-600 dark:text-blue-400">📞</span>
                              <span className="text-gray-900 dark:text-gray-100">{appointment.phone}</span>
                            </motion.div>
                          )}
                          {appointment.notes && appointment.notes !== 'No additional notes' && appointment.notes.trim() !== '' && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm text-gray-900 dark:text-gray-100"
                            >
                              <strong>{t('reschedule_notes') || 'Notes'}:</strong> {appointment.notes}
                            </motion.div>
                          )}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Show loading message if doctor working days not loaded yet */}
                  {doctorWorkingDays.length === 0 && (
                    <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-yellow-300 border-t-yellow-600"></div>
                        <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                          {t('booking_loading_availability') || 'Loading doctor availability...'}
                        </p>
                      </div>
                      <p className="text-base text-gray-700 dark:text-gray-300">
                        {t('booking_please_wait_schedule') || 'Please wait while we fetch the schedule.'}
                      </p>
                    </div>
                  )}

                  {/* Only show calendar and time slots when ready */}
                  {doctorWorkingDays.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6, duration: 0.4 }}
                      className="grid lg:grid-cols-2 gap-6"
                    >
                      {/* Calendar */}
                      <div className="flex flex-col">
                        <h4 className="font-bold text-xl mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                          <CalendarIcon className="w-6 h-6 mr-2 text-[#4DBCC4]" />
                          {t('reschedule_select_new_date') || 'Select New Date'}
                        </h4>
                        {doctorWorkingDays.length > 0 && (
                          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                            <p className="text-base text-gray-900 dark:text-gray-100 leading-relaxed">
                              <strong className="text-[#4DBCC4]">{appointment.doctorName || t('reschedule_doctor_label') || 'Doctor'}</strong> {t('booking_doctor_available_on') || 'is available on:'} {' '}
                              <span className="font-semibold">
                                {doctorWorkingDays.map(day => {
                                  const dayNames = [
                                    t('booking_day_sunday') || 'Sunday',
                                    t('booking_day_monday') || 'Monday',
                                    t('booking_day_tuesday') || 'Tuesday',
                                    t('booking_day_wednesday') || 'Wednesday',
                                    t('booking_day_thursday') || 'Thursday',
                                    t('booking_day_friday') || 'Friday',
                                    t('booking_day_saturday') || 'Saturday'
                                  ];
                                  return dayNames[day];
                                }).join(', ')}
                              </span>
                            </p>
                          </div>
                        )}
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={isDateDisabled}
                          className="rounded-xl border-2 border-gray-300 dark:border-gray-600 shadow-lg p-4 bg-white dark:bg-gray-800 w-full"
                        />
                      </div>

                      {/* Time Slots */}
                      <div>
                        <h4 className="font-bold text-xl mb-4 text-gray-900 dark:text-gray-100 flex items-center">
                          <Clock className="w-6 h-6 mr-2 text-[#4DBCC4]" />
                          {t('reschedule_select_new_time') || 'Select New Time'}
                        </h4>
                        {selectedDate ? (
                          loadingAvailability ? (
                            <div className="flex items-center justify-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
                              <div className="flex flex-col items-center gap-3">
                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-gray-300 border-t-[#4DBCC4]"></div>
                                <span className="text-base text-gray-900 dark:text-gray-100 font-medium">{t('booking_loading_times') || 'Loading available times...'}</span>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="grid grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2">
                                {availableSlots.map((slot, index) => (
                                  <motion.div
                                    key={slot.time}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.03 }}
                                    whileHover={slot.is_available && !slot.is_booked ? { scale: 1.05, y: -2 } : {}}
                                    whileTap={slot.is_available && !slot.is_booked ? { scale: 0.95 } : {}}
                                  >
                                    <Button
                                      variant={selectedTime === slot.time ? "default" : "outline"}
                                      size="lg"
                                      onClick={() => setSelectedTime(slot.time)}
                                      disabled={slot.is_booked || !slot.is_available}
                                      className={`
                                w-full font-bold text-base py-6
                                ${slot.is_booked || !slot.is_available
                                          ? "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed border-gray-300 dark:border-gray-600 opacity-60"
                                          : selectedTime === slot.time
                                            ? "ring-4 ring-[#4DBCC4]/30 bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] border-2 border-[#4DBCC4] shadow-xl text-white"
                                            : "hover:ring-2 hover:ring-[#4DBCC4]/50 bg-white dark:bg-gray-800 hover:bg-[#4DBCC4]/5 dark:hover:bg-[#4DBCC4]/10 hover:shadow-lg text-gray-900 dark:text-gray-100 border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4]"}
                              `}
                                    >
                                      {slot.time}
                                      {slot.is_booked && (
                                        <span className="block text-xs mt-1">({t('booking_time_booked') || 'Booked'})</span>
                                      )}
                                    </Button>
                                  </motion.div>
                                ))}
                              </div>

                              {availableSlots.length === 0 && (
                                <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-dashed border-red-300 dark:border-red-800">
                                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Clock className="w-8 h-8 text-red-500" />
                                  </div>
                                  <p className="text-gray-900 dark:text-gray-100 font-bold text-lg mb-2">
                                    {t('booking_no_slots_date') || 'No available time slots for this date'}
                                  </p>
                                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {t('booking_try_another_date') || 'Please select another date'}
                                  </p>
                                  {doctorWorkingDays.length > 0 && (
                                    <p className="text-[#4DBCC4] dark:text-[#4DBCC4] text-sm mt-3 font-medium">
                                      {t('booking_doctor_available_hint') || 'Available days are highlighted in the calendar'}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        ) : (
                          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-900 dark:text-gray-100 font-semibold text-lg">{t('booking_select_date_first') || 'Please select a date first'}</p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}

                  {/* Consultation Fee Display */}
                  {actualConsultationFee > 0 && (
                    <div className="p-4 bg-[#4DBCC4]/10 dark:bg-[#4DBCC4]/20 rounded-lg border-2 border-[#4DBCC4]/30">
                      <p className="text-base text-gray-900 dark:text-gray-100">
                        <span className="font-semibold text-[#4DBCC4]">{t('reschedule_consultation_fee') || 'Consultation Fee'}:</span> ₱{actualConsultationFee}
                      </p>
                    </div>
                  )}

                  {/* Reason for Rescheduling Section */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="reason" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 block">
                        {t('reschedule_reason_label') || 'Reason for Rescheduling (Optional)'}
                      </Label>
                      <Textarea
                        id="reason"
                        placeholder={t('reschedule_reason_placeholder') || "Please provide a reason for rescheduling..."}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-2 border-2 border-gray-300 dark:border-gray-600 focus:border-[#4DBCC4] focus:ring-2 focus:ring-[#4DBCC4]/20 text-gray-900 dark:text-gray-100"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="gap-2 p-6 -mb-6 bg-white dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700">
                  <Button variant="outline" onClick={onClose} disabled={loading} className="border-2 border-gray-300 dark:border-gray-600 hover:border-[#4DBCC4] dark:hover:border-[#4DBCC4] hover:bg-[#4DBCC4]/10 dark:hover:bg-[#4DBCC4]/20 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold">
                    {t('reschedule_cancel') || 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleReschedule}
                    disabled={!selectedDate || !selectedTime || loading}
                    className="bg-gradient-to-r from-[#4DBCC4] to-[#3da8b0] hover:from-[#3da8b0] hover:to-[#4DBCC4] dark:from-[#4DBCC4] dark:to-[#3da8b0] dark:hover:from-[#3da8b0] dark:hover:to-[#4DBCC4] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                        {t('reschedule_rescheduling') || 'Rescheduling...'}
                      </div>
                    ) : (
                      t('reschedule_button') || "Reschedule Appointment"
                    )}
                  </Button>
                </DialogFooter>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
} 