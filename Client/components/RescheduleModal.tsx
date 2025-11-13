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
  const { t } = useLocale();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Enhanced state for comprehensive schedule handling (like BookingModal)
  const [availableSlots, setAvailableSlots] = useState<Array<{time: string, is_available: boolean, is_booked: boolean}>>([]);
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
      
      // Use the center-specific doctor available slots endpoint
      // Include center_id if present on appointment for center-aware availability
      // Include exclude_appointment_id to exclude the current appointment from booked slots (for rescheduling)
      // Include appointment_type to filter schedules correctly (home_visit vs clinic)
      let apiUrl = `/api/doctor-schedule/${doctorId}/available-slots?date=${dateString}`;
      const maybeCenterId = (appointment as any)?.center_id;
      if (maybeCenterId) {
        apiUrl += `&center_id=${maybeCenterId}`;
      }
      // Pass appointment_type to filter schedules correctly
      apiUrl += `&appointment_type=${appointmentType}`;
      // Exclude current appointment from booked slots when rescheduling
      if (appointment?.id) {
        apiUrl += `&exclude_appointment_id=${encodeURIComponent(appointment.id)}`;
      }
      const headers = {
        'Content-Type': 'application/json',
      };
      
      console.log('🔗 Making API request to:', apiUrl);
      const response = await fetch(apiUrl, { headers });
      
      const result = await response.json();
      
      if (result.success && result.available_slots) {
        // Handle new slot structure with status flags (same as BookingModal)
        const slots = result.available_slots || [];
        console.log('📅 RESCHEDULE MODAL - Available slots from API:', slots);
        console.log('📅 RESCHEDULE MODAL - Slot structure:', slots[0]);
        console.log('📅 RESCHEDULE MODAL - Final available slots:', slots);
        
        setAvailableSlots(slots);
        setBookedSlots(result.booked_slots || []);
      } else {
        console.log('❌ No slots available for this date:', result.message || 'Unknown reason');
        setAvailableSlots([]);
        setBookedSlots([]);
      }
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
      let validationUrl = `/api/doctor-schedule/${appointment.doctor_id}/available-slots?date=${dateString}`;
      const maybeCenterId2 = (appointment as any)?.center_id;
      if (maybeCenterId2) {
        validationUrl += `&center_id=${maybeCenterId2}`;
      }
      // Exclude current appointment from booked slots when validating
      if (appointment?.id) {
        validationUrl += `&exclude_appointment_id=${encodeURIComponent(appointment.id)}`;
      }
      const validationResponse = await fetch(validationUrl);
      const validationResult = await validationResponse.json();
      
      if (validationResult.success && validationResult.available_slots) {
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
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden border bg-white">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.3 }}
                className="max-h-[85vh] overflow-y-auto"
              >
                <motion.div
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                  className="bg-white p-6 text-black -m-6 mb-6 border-b"
                >
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center text-black flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <CalendarIcon className="w-6 h-6" />
                      </motion.div>
                      {t('reschedule_title') || 'Reschedule Appointment'}
                    </DialogTitle>
                  </DialogHeader>
                </motion.div>

                <div className="space-y-6 p-6 -mt-6">
                  {/* Current Appointment Info */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.4 }}
                  >
                    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-0 shadow-md">
                      <CardContent className="p-4">
                        <motion.h3 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="font-semibold text-black mb-3 flex items-center gap-2"
                        >
                          <Clock className="w-4 h-4 text-blue-600" />
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
                            <User className="w-4 h-4 text-blue-600" />
                            <span className="font-medium text-black">{appointment.doctorName || t('reschedule_doctor_label') || 'Doctor'}</span>
                            {appointment.specialty && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                              >
                                <Badge variant="outline" className="text-xs text-black border-gray-300">{appointment.specialty}</Badge>
                              </motion.div>
                            )}
                          </motion.div>
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex items-center gap-2"
                          >
                            <CalendarIcon className="w-4 h-4 text-blue-600" />
                            <span className="text-black">
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
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span className="text-black">
                              {appointment.duration ? `${appointment.duration} ${t('reschedule_min') || 'min'}` : `30 ${t('reschedule_min') || 'min'}`} - {appointment.type || t('reschedule_consultation') || 'Consultation'}
                            </span>
                          </motion.div>
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                            className="flex items-center gap-2"
                          >
                            <MapPin className="w-4 h-4 text-blue-600" />
                            <span className="text-black">{appointment.location || appointment.address || t('reschedule_medical_center') || 'Medical Center'}</span>
                          </motion.div>
                          {appointment.phone && (
                            <motion.div 
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.4 }}
                              className="flex items-center gap-2"
                            >
                              <span className="w-4 h-4 text-blue-600">📞</span>
                              <span className="text-black">{appointment.phone}</span>
                            </motion.div>
                          )}
                          {appointment.notes && appointment.notes !== 'No additional notes' && appointment.notes.trim() !== '' && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.5 }}
                              className="mt-2 p-2 bg-gray-100 rounded text-sm text-black"
                            >
                              <strong>{t('reschedule_notes') || 'Notes'}:</strong> {appointment.notes}
                            </motion.div>
                          )}
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6, duration: 0.4 }}
                    className="grid lg:grid-cols-2 gap-6"
                  >
                    <div className="flex flex-col items-center">
                      <motion.h3 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.7 }}
                        className="text-lg font-semibold mb-4 flex items-center text-black self-start"
                      >
                        <motion.div
                          animate={{ rotate: [0, 5, -5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <CalendarIcon className="h-5 w-5 mr-2 text-blue-600" />
                        </motion.div>
                        {t('reschedule_select_new_date') || 'Select New Date'}
                      </motion.h3>
                      <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.8, duration: 0.4 }}
                        className="flex justify-center"
                      >
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateSelect}
                          disabled={isDateDisabled}
                          className="rounded-lg border-0 shadow-md bg-white/50 backdrop-blur-sm"
                        />
                      </motion.div>
                      {doctorWorkingDays.length > 0 && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.9 }}
                          className="text-sm text-black mt-2 text-center"
                        >
                          {t('reschedule_available_on') || 'Available on'}: {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                            .filter((_, index) => doctorWorkingDays.includes(index))
                            .join(', ')}
                        </motion.p>
                      )}
                    </div>

                    {/* Enhanced Time Selection */}
                    <div className="w-full">
                      <AnimatePresence>
                        {selectedDate && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4 }}
                            className="w-full"
                          >
                            <motion.h3 
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 }}
                              className="text-lg font-semibold mb-4 flex items-center text-black"
                            >
                              <motion.div
                                animate={{ rotate: [0, 360] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                              >
                                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                              </motion.div>
                              {t('reschedule_select_new_time') || 'Select New Time'}
                            </motion.h3>
                            
                            {loadingAvailability ? (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center py-8"
                              >
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                  className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto"
                                />
                                <p className="mt-2 text-gray-900">{t('reschedule_loading_times') || 'Loading available times...'}</p>
                              </motion.div>
                            ) : availableSlots.length > 0 ? (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3"
                              >
                                {availableSlots.map((slot, index) => (
                                  <motion.div
                                    key={slot.time}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.05, duration: 0.3 }}
                                    whileHover={slot.is_available && !slot.is_booked ? { scale: 1.05, y: -2 } : {}}
                                    whileTap={slot.is_available && !slot.is_booked ? { scale: 0.95 } : {}}
                                  >
                                    <Card
                                      className={`transition-all duration-300 ${
                                        slot.is_booked || !slot.is_available
                                          ? 'bg-gray-200 cursor-not-allowed opacity-60 border-gray-300'
                                          : selectedTime === slot.time 
                                            ? 'cursor-pointer ring-2 ring-emerald-500 bg-emerald-50 shadow-lg hover:shadow-lg' 
                                            : 'cursor-pointer hover:ring-1 hover:ring-emerald-300 bg-white/80 backdrop-blur-sm hover:shadow-lg'
                                      }`}
                                      onClick={() => {
                                        if (slot.is_available && !slot.is_booked) {
                                          setSelectedTime(slot.time);
                                        }
                                      }}
                                    >
                                      <CardContent className="p-3 text-center">
                                        <div className={`text-sm font-medium ${
                                          slot.is_booked || !slot.is_available
                                            ? 'text-gray-500'
                                            : selectedTime === slot.time 
                                              ? 'text-emerald-700' 
                                              : 'text-gray-700'
                                        }`}>
                                          {slot.time}
                                          {slot.is_booked && (
                                            <span className="block text-xs text-gray-400 mt-1">({t('reschedule_booked') || 'Booked'})</span>
                                          )}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </motion.div>
                                ))}
                              </motion.div>
                            ) : (
                              <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-center py-8"
                              >
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: "spring", stiffness: 200 }}
                                >
                                  <AlertCircle className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                                </motion.div>
                                <p className="text-gray-900">{t('reschedule_no_slots') || 'No available time slots for this date.'}</p>
                                <p className="text-sm text-gray-600">{t('reschedule_select_different_date') || 'Please select a different date.'}</p>
                              </motion.div>
                            )}

                            {actualConsultationFee > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-4 p-3 bg-emerald-50/80 backdrop-blur-sm rounded-lg border border-emerald-200"
                              >
                                <p className="text-sm text-emerald-700">
                                  <span className="font-medium">{t('reschedule_consultation_fee') || 'Consultation Fee'}:</span> ₱{actualConsultationFee}
                                </p>
                              </motion.div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>

                  {/* Reason for Rescheduling */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.0, duration: 0.4 }}
                  >
                    <Label htmlFor="reason" className="text-base font-medium text-gray-800">
                      {t('reschedule_reason_label') || 'Reason for Rescheduling (Optional)'}
                    </Label>
                    <motion.div
                      whileFocus={{ scale: 1.02 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Textarea
                        id="reason"
                        placeholder={t('reschedule_reason_placeholder') || "Please provide a reason for rescheduling..."}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="mt-2 bg-white/80 backdrop-blur-sm border-gray-200 focus:border-blue-400 focus:ring-blue-400"
                        rows={3}
                      />
                    </motion.div>
                  </motion.div>

                  {/* Warning */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.4 }}
                    className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200 rounded-lg p-3"
                  >
                    <div className="flex items-start gap-2">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      </motion.div>
                      <div className="text-sm text-yellow-800">
                        <p className="font-medium">{t('reschedule_warning_title') || 'Important'}:</p>
                        <p>{t('reschedule_warning_message') || 'Rescheduling may affect your doctor\'s availability. Please ensure the new time works for you.'}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.4, duration: 0.4 }}
                >
                  <DialogFooter className="gap-2 p-6 -mb-6 bg-gray-50/80 backdrop-blur-sm">
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button variant="outline" onClick={onClose} disabled={loading} className="hover:shadow-md transition-all">
                        {t('reschedule_cancel') || 'Cancel'}
                      </Button>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button 
                        onClick={handleReschedule} 
                        disabled={!selectedDate || !selectedTime || loading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg transition-all"
                      >
                        {loading ? (
                          <motion.div className="flex items-center gap-2">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                              className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                            />
                            {t('reschedule_rescheduling') || 'Rescheduling...'}
                          </motion.div>
                        ) : (
                          t('reschedule_button') || "Reschedule Appointment"
                        )}
                      </Button>
                    </motion.div>
                  </DialogFooter>
                </motion.div>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
} 