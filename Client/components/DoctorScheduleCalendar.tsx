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
    const { t } = useLocale();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

    // Time slots from 8 AM to 8 PM
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const hour = i + 8;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

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
            // Day view
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
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${minutes} ${ampm}`;
    };

    // Format date for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', {
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
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {t('dd_schedule_calendar') || 'Schedule Calendar'}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t('dd_schedule_calendar_desc') || 'View and manage your appointments in calendar format'}
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Mode Toggle */}
                    <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                        <Button
                            variant={viewMode === 'day' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('day')}
                            className="px-3 py-1 text-xs"
                        >
                            {t('dd_day_view') || 'Day'}
                        </Button>
                        <Button
                            variant={viewMode === 'week' ? 'default' : 'ghost'}
                            size="sm"
                            onClick={() => setViewMode('week')}
                            className="px-3 py-1 text-xs"
                        >
                            {t('dd_week_view') || 'Week'}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={navigatePrevious}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={goToToday}>
                            {t('dd_today') || 'Today'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={navigateNext}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <Card>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <div className="min-w-full">
                            {/* Header Row */}
                            <div className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700">
                                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
                                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {t('dd_time') || 'Time'}
                                    </span>
                                </div>
                                {Object.keys(appointmentsByDate).map((dateStr) => {
                                    const date = new Date(dateStr + 'T00:00:00');
                                    const isToday = date.toDateString() === new Date().toDateString();
                                    return (
                                        <div
                                            key={dateStr}
                                            className={`p-4 border-r border-gray-200 dark:border-gray-700 text-center ${isToday
                                                    ? 'bg-blue-50 dark:bg-blue-900/20'
                                                    : 'bg-gray-50 dark:bg-gray-800'
                                                }`}
                                        >
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                {formatDate(date)}
                                            </div>
                                            <div className={`text-xs ${isToday
                                                    ? 'text-blue-600 dark:text-blue-400'
                                                    : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Time Slots */}
                            {timeSlots.map((timeSlot) => (
                                <div key={timeSlot} className="grid grid-cols-8 border-b border-gray-200 dark:border-gray-700 min-h-[80px]">
                                    {/* Time Column */}
                                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex items-center">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {formatTime(timeSlot)}
                                        </span>
                                    </div>

                                    {/* Appointment Columns */}
                                    {Object.keys(appointmentsByDate).map((dateStr) => {
                                        const appointment = getAppointmentForSlot(dateStr, timeSlot);
                                        return (
                                            <div
                                                key={`${dateStr}-${timeSlot}`}
                                                className="p-2 border-r border-gray-200 dark:border-gray-700 min-h-[80px]"
                                            >
                                                {appointment && (
                                                    <div
                                                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full"
                                                        onClick={() => onAppointmentClick?.(appointment)}
                                                    >
                                                        <div className="flex items-start justify-between mb-2">
                                                            <Badge className={`text-xs px-2 py-1 ${getStatusColor(appointment.status)}`}>
                                                                {appointment.status}
                                                            </Badge>
                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                                                        <MoreVertical className="w-3 h-3" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onClick={() => onAppointmentClick?.(appointment)}>
                                                                        <Eye className="w-4 h-4 mr-2" />
                                                                        {t('dd_view_details') || 'View Details'}
                                                                    </DropdownMenuItem>
                                                                    {appointment.status !== 'completed' && (
                                                                        <DropdownMenuItem onClick={() => onStatusUpdate?.(appointment.id, 'completed')}>
                                                                            <CalendarIcon className="w-4 h-4 mr-2" />
                                                                            {t('dd_mark_completed') || 'Mark Completed'}
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>

                                                        <div className="space-y-1">
                                                            <div className="flex items-center text-sm font-medium text-gray-900 dark:text-white">
                                                                <User className="w-3 h-3 mr-1" />
                                                                <span className="truncate">{appointment.patient_name}</span>
                                                            </div>

                                                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                                <MapPin className="w-3 h-3 mr-1" />
                                                                <span className="truncate">{appointment.appointment_type}</span>
                                                            </div>

                                                            {appointment.patient_phone && (
                                                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                                                    <Phone className="w-3 h-3 mr-1" />
                                                                    <span className="truncate">{appointment.patient_phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Summary Stats */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('dd_total_appointments') || 'Total Appointments'}
                                </p>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                    {appointments.length}
                                </p>
                            </div>
                            <Calendar className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('dd_confirmed') || 'Confirmed'}
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {appointments.filter(apt => apt.status === 'confirmed').length}
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-green-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('dd_pending') || 'Pending'}
                                </p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {appointments.filter(apt => apt.status === 'pending').length}
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-yellow-500" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {t('dd_completed') || 'Completed'}
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {appointments.filter(apt => apt.status === 'completed').length}
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-blue-500" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}