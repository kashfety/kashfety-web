"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, User, Phone, Mail, MapPin, FileText, Stethoscope, CheckCircle } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

interface Appointment {
    id: string;
    appointment_date: string;
    appointment_time: string;
    status: string;
    appointment_type: string;
    type: string;
    consultation_fee: number;
    symptoms?: string;
    chief_complaint?: string;
    notes?: string;
    patient_id: string;
    patient_name: string;
    name?: string;
    name_ar?: string;
    first_name?: string;
    first_name_ar?: string;
    last_name?: string;
    last_name_ar?: string;
    patient_phone?: string;
    patient_email?: string;
}

interface AppointmentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment | null;
    onStatusUpdate?: (appointmentId: string, newStatus: string) => void;
    onStartConsultation?: (appointment: Appointment) => void;
}

export default function AppointmentDetailsModal({
    isOpen,
    onClose,
    appointment,
    onStatusUpdate,
    onStartConsultation
}: AppointmentDetailsModalProps) {
    const { t, locale } = useLocale();

    if (!appointment) return null;

    // Get localized patient name
    const getLocalizedPatientName = (appointment: Appointment) => {
        if (locale === 'ar') {
            // Try name_ar first
            if (appointment.name_ar) return appointment.name_ar;
            // Try first_name_ar + last_name_ar
            if (appointment.first_name_ar || appointment.last_name_ar) {
                const firstName = appointment.first_name_ar || '';
                const lastName = appointment.last_name_ar || '';
                const fullName = `${firstName} ${lastName}`.trim();
                if (fullName) return fullName;
            }
        }
        // Fall back to English
        if (appointment.name) return appointment.name;
        if (appointment.first_name || appointment.last_name) {
            const firstName = appointment.first_name || '';
            const lastName = appointment.last_name || '';
            return `${firstName} ${lastName}`.trim();
        }
        return appointment.patient_name;
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            case 'cancelled':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'completed':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    // Format time for display
    const formatTime = (time: string) => {
        if (!time) return '';
        const [hours, minutes] = time.split(':');
        const hour = parseInt(hours);
        
        if (locale === 'ar') {
            // Arabic 24-hour format
            return `${toArabicNumerals(hour)}:${toArabicNumerals(parseInt(minutes))}`;
        }
        
        // English AM/PM format
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Format date for display
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Convert numbers to Arabic numerals
    const toArabicNumerals = (num: number) => {
        if (locale !== 'ar') return num.toString();
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return num.toString().split('').map(digit => arabicNumerals[parseInt(digit)] || digit).join('');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-xl font-bold">{t('dd_appointment_details') || 'Appointment Details'}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400 font-normal">
                                {getLocalizedPatientName(appointment)}
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Status and Quick Actions */}
                    <div className="flex items-center justify-between">
                        <Badge className={`px-3 py-1 rounded-full font-medium ${getStatusColor(appointment.status)}`}>
                            {appointment.status}
                        </Badge>
                        <div className="flex gap-2">
                            {appointment.status === 'confirmed' && onStartConsultation && (
                                <Button
                                    size="sm"
                                    onClick={() => onStartConsultation(appointment)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Stethoscope className="w-4 h-4 mr-1" />
                                    {t('dd_start_consultation') || 'Start Consultation'}
                                </Button>
                            )}
                            {appointment.status !== 'completed' && onStatusUpdate && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => onStatusUpdate(appointment.id, 'completed')}
                                    className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
                                >
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    {t('dd_mark_completed') || 'Mark Completed'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Appointment Information */}
                    <Card className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                {t('dd_appointment_info') || 'Appointment Information'}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {t('dd_date') || 'Date'}
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {formatDate(appointment.appointment_date)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                        <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {t('dd_time') || 'Time'}
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {formatTime(appointment.appointment_time)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                                        <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {t('dd_type') || 'Type'}
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            {appointment.appointment_type} • {appointment.type}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                                        <span className="text-sm font-bold text-orange-600 dark:text-orange-400">$</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {t('dd_fee') || 'Consultation Fee'}
                                        </p>
                                        <p className="font-semibold text-gray-900 dark:text-white">
                                            ${locale === 'ar' ? toArabicNumerals(appointment.consultation_fee) : appointment.consultation_fee}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Patient Information */}
                    <Card className="bg-gradient-to-br from-emerald-50/50 to-blue-50/50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800">
                        <CardContent className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                {t('dd_patient_info') || 'Patient Information'}
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center">
                                        <User className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {getLocalizedPatientName(appointment)}
                                        </p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {t('dd_patient_id') || 'Patient ID'}: {appointment.patient_id}
                                        </p>
                                    </div>
                                </div>
                                {appointment.patient_phone && (
                                    <div className="flex items-center gap-3 ml-15">
                                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                            <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {t('dd_phone') || 'Phone'}
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {appointment.patient_phone}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {appointment.patient_email && (
                                    <div className="flex items-center gap-3 ml-15">
                                        <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                            <Mail className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                                {t('dd_email') || 'Email'}
                                            </p>
                                            <p className="font-semibold text-gray-900 dark:text-white">
                                                {appointment.patient_email}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Medical Information */}
                    {(appointment.symptoms || appointment.chief_complaint || appointment.notes) && (
                        <Card className="bg-gradient-to-br from-orange-50/50 to-red-50/50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800">
                            <CardContent className="p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                                    {t('dd_medical_info') || 'Medical Information'}
                                </h3>
                                <div className="space-y-4">
                                    {appointment.chief_complaint && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                {t('dd_chief_complaint') || 'Chief Complaint'}
                                            </p>
                                            <p className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-gray-900 dark:text-white">
                                                {appointment.chief_complaint}
                                            </p>
                                        </div>
                                    )}
                                    {appointment.symptoms && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                {t('dd_symptoms') || 'Symptoms'}
                                            </p>
                                            <p className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-gray-900 dark:text-white">
                                                {appointment.symptoms}
                                            </p>
                                        </div>
                                    )}
                                    {appointment.notes && (
                                        <div>
                                            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                                                {t('dd_notes') || 'Notes'}
                                            </p>
                                            <p className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-gray-900 dark:text-white">
                                                {appointment.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <DialogFooter className="flex gap-2">
                    <Button variant="outline" onClick={onClose}>
                        {t('dd_close') || 'Close'}
                    </Button>
                    {appointment.status === 'confirmed' && onStartConsultation && (
                        <Button
                            onClick={() => onStartConsultation(appointment)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <Stethoscope className="w-4 h-4 mr-2" />
                            {t('dd_start_consultation') || 'Start Consultation'}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}