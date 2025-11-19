"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/components/providers/locale-provider";
import {
    Calendar,
    Clock,
    User,
    Phone,
    MapPin,
    ChevronLeft,
    ChevronRight,
    MoreVertical,
    Eye,
    Edit,
    Calendar as CalendarIcon
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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

interface DoctorScheduleCalendarProps {
    appointments: Appointment[];
    onAppointmentClick?: (appointment: Appointment) => void;
    onStatusUpdate?: (appointmentId: string, newStatus: string) => void;
}

export default function DoctorScheduleCalendar({
    appointments,
    onAppointmentClick,
    onStatusUpdate
}: DoctorScheduleCalendarProps) {
    const { toast } = useToast();
    const { t, locale } = useLocale();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

    // Helper to get localized patient name
    const getLocalizedPatientName = (appointment: Appointment) => {
        if (!appointment) return 'Unknown Patient';
        
        if (locale === 'ar') {
            // Try name_ar first
            if (appointment.name_ar) return appointment.name_ar;
            
            // Build from first_name_ar + last_name_ar
            if (appointment.first_name_ar || appointment.last_name_ar) {
                return [appointment.first_name_ar, appointment.last_name_ar].filter(Boolean).join(' ').trim();
            }
        }
        
        // Fallback to English name
        if (appointment.name) return appointment.name;
        if (appointment.first_name || appointment.last_name) {
            return [appointment.first_name, appointment.last_name].filter(Boolean).join(' ').trim();
        }
        return appointment.patient_name || 'Unknown Patient';
    };

    // Helper to convert numbers to Arabic numerals
    const toArabicNumerals = (num: number | string): string => {
        if (locale !== 'ar') return String(num);
        const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
        return String(num).replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
    };

    // Localize appointment type
    const getLocalizedAppointmentType = (type: string) => {
        if (!type) return '';
        const lowerType = type.toLowerCase();
        if (lowerType === 'clinic') return locale === 'ar' ? 'عيادة' : 'clinic';
        if (lowerType === 'home') return locale === 'ar' ? 'منزل' : 'home';
        return type;
    };

    // Localize consultation type
    const getLocalizedConsultationType = (type: string) => {
        if (!type) return '';
        const lowerType = type.toLowerCase();
        if (lowerType === 'consultation') return locale === 'ar' ? 'استشارة' : 'consultation';
        if (lowerType === 'follow-up') return locale === 'ar' ? 'متابعة' : 'follow-up';
        if (lowerType === 'checkup') return locale === 'ar' ? 'فحص' : 'checkup';
        return type;
    };

    // Get all unique time slots from appointments, including non-whole hours
    const getAllTimeSlots = () => {
        const appointmentTimes = new Set<string>();
        appointments.forEach(apt => {
            if (apt.appointment_time) {
                // Extract hour:minute format (e.g., "09:30")
                const time = apt.appointment_time.substring(0, 5);
                appointmentTimes.add(time);
            }
        });
        
        // Add default hourly slots from 8 AM to 8 PM
        for (let i = 8; i <= 20; i++) {
            appointmentTimes.add(`${i.toString().padStart(2, '0')}:00`);
        }
        
        // Sort times chronologically
        return Array.from(appointmentTimes).sort();
    };

    const timeSlots = getAllTimeSlots();

    // Get appointments for the current view
    const getAppointmentsForView = () => {
        const today = new Date(currentDate);
        const appointments_filtered: { [key: string]: Appointment[] } = {};

        if (viewMode === 'week') {
            // Get week start (Monday)
            const startOfWeek = new Date(today);
            const day = startOfWeek.getDay();
            const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
            startOfWeek.setDate(diff);

            // Generate 7 days from Monday
            for (let i = 0; i < 7; i++) {
                const date = new Date(startOfWeek);
                date.setDate(startOfWeek.getDate() + i);
                const dateStr = date.toISOString().split('T')[0];
                appointments_filtered[dateStr] = appointments.filter(
                    apt => apt.appointment_date === dateStr
                );
            }
        } else {
            // Day view - only current date
            const dateStr = today.toISOString().split('T')[0];
            appointments_filtered[dateStr] = appointments.filter(
                apt => apt.appointment_date === dateStr
            );
        }

        return appointments_filtered;
    };

    const appointmentsByDate = getAppointmentsForView();

    // Navigation functions
    const navigatePrevious = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() - 7);
        } else {
            newDate.setDate(currentDate.getDate() - 1);
        }
        setCurrentDate(newDate);
    };

    const navigateNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(currentDate.getDate() + 7);
        } else {
            newDate.setDate(currentDate.getDate() + 1);
        }
        setCurrentDate(newDate);
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'confirmed':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'scheduled':
                return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
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
            return `${toArabicNumerals(hour)}:${toArabicNumerals(minutes)}`;
        }
        
        // English AM/PM format
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Format date for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get appointment for specific date and time slot
    const getAppointmentForSlot = (date: string, timeSlot: string) => {
        const dayAppointments = appointmentsByDate[date] || [];
        return dayAppointments.find(apt => {
            const aptTime = apt.appointment_time.substring(0, 5); // Get HH:MM
            return aptTime === timeSlot;
        });
    };

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            {/* Floating background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-600/10 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '5s' }}></div>
            </div>

            {/* Header */}
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600 bg-clip-text text-transparent">
                        {t('dd_schedule_calendar') || 'Schedule Calendar'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                        {t('dd_schedule_calendar_desc') || 'View and manage your appointments in calendar format'}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* View Mode Toggle */}
                    <div className="flex bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-white/20 dark:border-gray-700/20">
                        <Button
                            variant={viewMode === 'day' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('day')}
                            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${viewMode === 'day'
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('dd_day_view') || 'Day'}
                        </Button>
                        <Button
                            variant={viewMode === 'week' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('week')}
                            className={`px-4 py-2 text-sm font-medium transition-all duration-200 ${viewMode === 'week'
                                ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
                                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {t('dd_week_view') || 'Week'}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-1 shadow-lg border border-white/20 dark:border-gray-700/20">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={navigatePrevious}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={goToToday}
                            className="px-4 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                        >
                            {t('dd_today') || 'Today'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={navigateNext}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="relative z-10">
                <div className="shadow-2xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <div className="min-w-full relative">
                            {/* Sticky Header Row */}
                            <div className={`grid ${viewMode === 'day' ? 'grid-cols-2' : 'grid-cols-8'} border-b-2 border-blue-200 dark:border-blue-800 sticky top-0 z-30 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md shadow-sm`}>
                                <div className="p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        <Clock className="w-4 h-4" />
                                        {t('dd_time') || 'Time'}
                                    </span>
                                </div>

                                {viewMode === 'day' ? (
                                    // Single day header for day view
                                    (() => {
                                        const isToday = currentDate.toDateString() === new Date().toDateString();
                                        return (
                                            <div
                                                className={`p-4 text-center transition-all duration-300 ${isToday
                                                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 shadow-inner'
                                                    : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900'
                                                    }`}
                                            >
                                                <div className={`text-lg font-bold ${isToday
                                                    ? 'text-blue-700 dark:text-blue-300'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}>
                                                    {formatDate(currentDate)}
                                                </div>
                                                <div className={`text-sm font-medium mt-1 ${isToday
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    {currentDate.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                {isToday && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1 animate-pulse"></div>
                                                )}
                                            </div>
                                        );
                                    })()
                                ) : (
                                    // Multiple day headers for week view
                                    Object.keys(appointmentsByDate).map((dateStr) => {
                                        const date = new Date(dateStr + 'T00:00:00');
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        return (
                                            <div
                                                key={dateStr}
                                                className={`p-4 border-r border-gray-200 dark:border-gray-700 text-center transition-all duration-300 ${isToday
                                                    ? 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 shadow-inner'
                                                    : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900'
                                                    }`}
                                            >
                                                <div className={`text-sm font-bold ${isToday
                                                    ? 'text-blue-700 dark:text-blue-300'
                                                    : 'text-gray-900 dark:text-white'
                                                    }`}>
                                                    {formatDate(date)}
                                                </div>
                                                <div className={`text-xs font-medium mt-1 ${isToday
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-500 dark:text-gray-400'
                                                    }`}>
                                                    {date.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                                {isToday && (
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full mx-auto mt-1 animate-pulse"></div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Time Slots */}
                            {timeSlots.map((timeSlot, index) => (
                                <div key={timeSlot} className={`grid ${viewMode === 'day' ? 'grid-cols-2' : 'grid-cols-8'} border-b border-gray-100 dark:border-gray-800 min-h-[100px] transition-all duration-200 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 ${index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/30'} dark:${index % 2 === 0 ? 'bg-gray-900/50' : 'bg-gray-800/30'}`}>
                                    {/* Time Column */}
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-r border-gray-200 dark:border-gray-700 flex items-center justify-center">
                                        <div className="text-center">
                                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                                                {formatTime(timeSlot)}
                                            </span>
                                            <div className="w-8 h-px bg-gradient-to-r from-blue-300 to-purple-300 dark:from-blue-600 dark:to-purple-600 mt-1"></div>
                                        </div>
                                    </div>

                                    {/* Appointment Columns */}
                                    {viewMode === 'day' ? (
                                        // Single day column for day view
                                        (() => {
                                            const dateStr = currentDate.toISOString().split('T')[0];
                                            const appointment = getAppointmentForSlot(dateStr, timeSlot);
                                            const isToday = currentDate.toDateString() === new Date().toDateString();
                                            return (
                                                <div
                                                    className={`p-3 min-h-[100px] transition-all duration-200 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                                                        }`}
                                                >
                                                    {appointment && (
                                                        <div
                                                            className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl p-4 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full transform hover:-translate-y-1 hover:scale-[1.02] backdrop-blur-sm"
                                                            onClick={() => onAppointmentClick?.(appointment)}
                                                        >
                                                            {/* Gradient overlay for hover effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                            <div className="relative z-10 flex items-start justify-between mb-3">
                                                                <Badge className={`text-xs px-3 py-1 rounded-full font-medium shadow-sm ${getStatusColor(appointment.status)} border-0`}>
                                                                    {appointment.status}
                                                                </Badge>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                                            <MoreVertical className="w-3 h-3" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                                                                        <DropdownMenuItem onClick={() => onAppointmentClick?.(appointment)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                            <Eye className="w-4 h-4 mr-2" />
                                                                            {t('dd_view_details') || 'View Details'}
                                                                        </DropdownMenuItem>
                                                                        {appointment.status !== 'completed' && (
                                                                            <DropdownMenuItem onClick={() => onStatusUpdate?.(appointment.id, 'completed')} className="hover:bg-green-50 dark:hover:bg-green-900/20">
                                                                                <CalendarIcon className="w-4 h-4 mr-2" />
                                                                                {t('dd_mark_completed') || 'Mark Completed'}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>

                                                            <div className="relative z-10 space-y-2">
                                                                <div className="flex items-center text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                                                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                                        <User className="w-3 h-3 text-white" />
                                                                    </div>
                                                                    <span className="truncate">{getLocalizedPatientName(appointment)}</span>
                                                                </div>

                                                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                    <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                                        <MapPin className="w-2 h-2 text-white" />
                                                                    </div>
                                                                    <span className="truncate font-medium">{getLocalizedAppointmentType(appointment.appointment_type)} • {getLocalizedConsultationType(appointment.type)}</span>
                                                                </div>

                                                                {appointment.patient_phone && (
                                                                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                                                        <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                                            <Phone className="w-2 h-2 text-white" />
                                                                        </div>
                                                                        <span className="truncate font-medium">{appointment.patient_phone}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        // Multiple day columns for week view
                                        Object.keys(appointmentsByDate).map((dateStr) => {
                                            const appointment = getAppointmentForSlot(dateStr, timeSlot);
                                            const isToday = new Date(dateStr + 'T00:00:00').toDateString() === new Date().toDateString();
                                            return (
                                                <div
                                                    key={`${dateStr}-${timeSlot}`}
                                                    className={`p-2 border-r border-gray-200 dark:border-gray-700 min-h-[100px] transition-all duration-200 ${isToday ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                                                        }`}
                                                >
                                                    {appointment && (
                                                        <div
                                                            className="group relative bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl p-3 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer h-full transform hover:-translate-y-1 hover:scale-[1.02] backdrop-blur-sm"
                                                            onClick={() => onAppointmentClick?.(appointment)}
                                                        >
                                                            {/* Gradient overlay for hover effect */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                                            <div className="relative z-10 flex items-start justify-between mb-3">
                                                                <Badge className={`text-xs px-3 py-1 rounded-full font-medium shadow-sm ${getStatusColor(appointment.status)} border-0`}>
                                                                    {appointment.status}
                                                                </Badge>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                                                            <MoreVertical className="w-3 h-3" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end" className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
                                                                        <DropdownMenuItem onClick={() => onAppointmentClick?.(appointment)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20">
                                                                            <Eye className="w-4 h-4 mr-2" />
                                                                            {t('dd_view_details') || 'View Details'}
                                                                        </DropdownMenuItem>
                                                                        {appointment.status !== 'completed' && (
                                                                            <DropdownMenuItem onClick={() => onStatusUpdate?.(appointment.id, 'completed')} className="hover:bg-green-50 dark:hover:bg-green-900/20">
                                                                                <CalendarIcon className="w-4 h-4 mr-2" />
                                                                                {t('dd_mark_completed') || 'Mark Completed'}
                                                                            </DropdownMenuItem>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>

                                                            <div className="relative z-10 space-y-2">
                                                                <div className="flex items-center text-sm font-semibold text-gray-900 dark:text-white mb-1">
                                                                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                                        <User className="w-3 h-3 text-white" />
                                                                    </div>
                                                                    <span className="truncate">{getLocalizedPatientName(appointment)}</span>
                                                                </div>

                                                                <div className="flex items-center text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                                    <div className="w-4 h-4 bg-gradient-to-br from-emerald-400 to-emerald-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                                        <MapPin className="w-2 h-2 text-white" />
                                                                    </div>
                                                                    <span className="truncate font-medium">{getLocalizedAppointmentType(appointment.appointment_type)} • {getLocalizedConsultationType(appointment.type)}</span>
                                                                </div>

                                                                {appointment.patient_phone && (
                                                                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                                                                        <div className="w-4 h-4 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                                                                            <Phone className="w-2 h-2 text-white" />
                                                                        </div>
                                                                        <span className="truncate font-medium">{appointment.patient_phone}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="relative z-10 mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">
                                    {t('dd_total_appointments') || 'Total Appointments'}
                                </p>
                                <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                                    {toArabicNumerals(appointments.length)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Calendar className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-3 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"></div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">
                                    {t('dd_confirmed') || 'Confirmed'}
                                </p>
                                <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                                    {toArabicNumerals(appointments.filter(apt => apt.status === 'confirmed').length)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-3 h-1 bg-gradient-to-r from-green-400 to-green-600 rounded-full"></div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
                                    {t('dd_pending') || 'Pending'}
                                </p>
                                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">
                                    {toArabicNumerals(appointments.filter(apt => apt.status === 'pending').length)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-3 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"></div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-1">
                                    {t('dd_completed') || 'Completed'}
                                </p>
                                <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">
                                    {toArabicNumerals(appointments.filter(apt => apt.status === 'completed').length)}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Clock className="w-6 h-6 text-white" />
                            </div>
                        </div>
                        <div className="mt-3 h-1 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full"></div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}