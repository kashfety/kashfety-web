"use client"

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Save,
  RotateCcw,
  CheckCircle,
  Home,
  Building,
  MapPin
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import axios from "axios";
import { useLocale } from "@/components/providers/locale-provider";
import { formatCurrency } from "@/lib/i18n";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TimeSlot {
  time: string;
  duration: number;
}

interface ScheduleData {
  id?: string;
  day_of_week: number;
  is_available: boolean;
  time_slots: TimeSlot[];
  break_start?: string;
  break_end?: string;
  notes?: string;
  center_id?: string;
}

interface Center {
  id: string;
  name: string;
  name_ar?: string;
  address: string;
  phone?: string;
  email?: string;
  is_assigned: boolean;
  is_primary: boolean;
}

interface ScheduleManagementProps {
  doctorId: string;
}

const DAYS_OF_WEEK = [
  { value: 0, labelKey: 'day_sunday' },
  { value: 1, labelKey: 'day_monday' },
  { value: 2, labelKey: 'day_tuesday' },
  { value: 3, labelKey: 'day_wednesday' },
  { value: 4, labelKey: 'day_thursday' },
  { value: 5, labelKey: 'day_friday' },
  { value: 6, labelKey: 'day_saturday' }
] as const;

const generateTimeSlots = (
  startTime: string,
  endTime: string,
  breakStart?: string,
  breakEnd?: string,
  duration: number = 30
): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const start = new Date(`2000-01-01T${startTime}:00`);
  const end = new Date(`2000-01-01T${endTime}:00`);
  const breakStartTime = breakStart ? new Date(`2000-01-01T${breakStart}:00`) : null;
  const breakEndTime = breakEnd ? new Date(`2000-01-01T${breakEnd}:00`) : null;

  let current = new Date(start);

  while (current < end) {
    const timeStr = current.toTimeString().substring(0, 5);

    // Skip break time
    if (breakStartTime && breakEndTime && current >= breakStartTime && current < breakEndTime) {
      current = new Date(current.getTime() + duration * 60000);
      continue;
    }

    slots.push({
      time: timeStr,
      duration: duration
    });

    current = new Date(current.getTime() + duration * 60000);
  }

  return slots;
};

export default function DoctorScheduleManagement({ doctorId }: ScheduleManagementProps) {
  const { toast } = useToast();
  const { t, locale } = useLocale();
  const isRTL = locale === 'ar';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<ScheduleData[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [homeVisitsAvailable, setHomeVisitsAvailable] = useState(false);
  const [defaultConsultationFee, setDefaultConsultationFee] = useState<number>(0);

  // Helper to get localized center name
  const getLocalizedCenterName = (center: Center) => {
    if (locale === 'ar' && center.name_ar) {
      return center.name_ar;
    }
    return center.name;
  };

  // Helper to convert numbers to Arabic numerals
  const toArabicNumerals = (num: number | string): string => {
    if (locale !== 'ar') return String(num);
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return String(num).replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
  };

  // Conflict dialog state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [conflictDetails, setConflictDetails] = useState<string[]>([]);

  // Store form states per center - key is center_id, value is dayConfigs
  const [centerFormStates, setCenterFormStates] = useState<{
    [centerId: string]: {
      [key: number]: {
        isAvailable: boolean;
        startTime: string;
        endTime: string;
        breakStart: string;
        breakEnd: string;
        duration: number;
        notes: string;
      }
    }
  }>({});

  // Track which centers have been initialized
  const [initializedCenters, setInitializedCenters] = useState<Set<string>>(new Set());
  // Track which center's schedule was last fetched from server
  const [lastFetchedCenterId, setLastFetchedCenterId] = useState<string | null>(null);

  // Persistence key for selected center per doctor
  const selectionKey = doctorId ? `dr_schedule_selected_center_${doctorId}` : '';
  // Track if this is initial mount (to force DB fetch)
  const [isInitialMount, setIsInitialMount] = useState(true);

  // Load selected center on mount/doctor change, but always fetch fresh data from DB
  useEffect(() => {
    if (!doctorId) return;
    try {
      const persistedSelection = selectionKey ? localStorage.getItem(selectionKey) : null;
      if (persistedSelection) {
        setSelectedCenterId(persistedSelection);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [doctorId]);

  // Current day configs for the selected center
  const dayConfigs = centerFormStates[selectedCenterId] || {};

  // Helper function to get day config with defaults
  const getDayConfig = (dayIndex: number) => {
    return dayConfigs[dayIndex] || {
      isAvailable: false,
      startTime: '09:00',
      endTime: '17:00',
      breakStart: '12:00',
      breakEnd: '13:00',
      duration: 30,
      notes: ''
    };
  };

  const initializeDayConfigs = () => {
    if (!selectedCenterId) return;

    // If this center has already been initialized, don't reinitialize
    if (initializedCenters.has(selectedCenterId)) return;

    // If we already have persisted form state for this center, keep it and just mark initialized
    const persistedForCenter = centerFormStates[selectedCenterId];
    if (persistedForCenter && Object.keys(persistedForCenter).length > 0) {
      setInitializedCenters(prev => new Set([...prev, selectedCenterId!]));
      return;
    }

    const configs: {
      [key: number]: {
        isAvailable: boolean;
        startTime: string;
        endTime: string;
        breakStart: string;
        breakEnd: string;
        duration: number;
        notes: string;
      }
    } = {};

    DAYS_OF_WEEK.forEach(day => {
      const existingSchedule = schedule.find(s => s.center_id === selectedCenterId && s.day_of_week === day.value);
      const hasSlots = Array.isArray(existingSchedule?.time_slots) && existingSchedule.time_slots.length > 0;
      configs[day.value] = {
        // If is_available missing/falsey, infer from presence of time slots
        isAvailable: (existingSchedule?.is_available ?? (hasSlots ? true : false)),
        startTime: existingSchedule?.time_slots?.[0]?.time || '09:00',
        endTime: existingSchedule?.time_slots && existingSchedule.time_slots.length > 0
          ? (() => {
            const lastSlot = existingSchedule.time_slots[existingSchedule.time_slots.length - 1];
            const endTime = new Date(`2000-01-01T${lastSlot.time}:00`);
            endTime.setMinutes(endTime.getMinutes() + lastSlot.duration);
            return endTime.toTimeString().substring(0, 5);
          })()
          : '17:00',
        breakStart: existingSchedule?.break_start || '',
        breakEnd: existingSchedule?.break_end || '',
        duration: existingSchedule?.time_slots?.[0]?.duration || 30,
        notes: existingSchedule?.notes || ''
      };
    });

    // Update the form state for this center from server schedule
    setCenterFormStates(prev => ({
      ...prev,
      [selectedCenterId]: configs
    }));

    // Mark this center as initialized
    setInitializedCenters(prev => new Set([...prev, selectedCenterId]));
  };

  // Build full 7-day configs from a schedule array (DB response)
  const buildConfigsFromSchedule = (centerId: string, scheduleRows: ScheduleData[]) => {
    const configs: {
      [key: number]: {
        isAvailable: boolean;
        startTime: string;
        endTime: string;
        breakStart: string;
        breakEnd: string;
        duration: number;
        notes: string;
      }
    } = {};

    // Index rows by normalized day (0..6), coerce types and handle 1..7 with 7→0 (Sunday=0)
    const rowsByDay: Record<number, ScheduleData> = {} as any;
    (scheduleRows || []).forEach((r) => {
      // accept matches where center_id equals or missing (legacy)
      if (r && (r.center_id === centerId || !r.center_id)) {
        let d: any = (r as any).day_of_week;
        const num = typeof d === 'string' ? parseInt(d, 10) : Number(d);
        if (!isNaN(num)) {
          const norm = num === 7 ? 0 : num; // map 7→0
          rowsByDay[norm] = r;
        }
      }
    });

    DAYS_OF_WEEK.forEach(day => {
      const row = rowsByDay[day.value];
      const slots: any[] = Array.isArray((row as any)?.time_slots) ? (row as any).time_slots : [];
      // Support slot shapes: {time,duration} or simple "HH:MM"
      const getTime = (slot: any) => typeof slot === 'string' ? slot : slot?.time;
      const getDuration = (slot: any) => typeof slot === 'string' ? (row as any)?.slot_duration || 30 : (slot?.duration || (row as any)?.slot_duration || 30);

      const hasSlots = slots.length > 0 && !!getTime(slots[0]);
      const firstSlotTime = hasSlots ? getTime(slots[0]) : '09:00';
      const firstSlotDuration = hasSlots ? getDuration(slots[0]) : ((row as any)?.slot_duration || 30);
      let endTime = '17:00';
      if (hasSlots) {
        const last = slots[slots.length - 1];
        const lt = getTime(last) as string;
        const ld = getDuration(last) as number;
        if (lt) {
          const end = new Date(`2000-01-01T${lt}:00`);
          end.setMinutes(end.getMinutes() + (ld || 30));
          endTime = end.toTimeString().substring(0, 5);
        }
      }

      const explicitAvail = (row as any)?.is_available;
      const inferredAvail = hasSlots ? true : false;

      configs[day.value] = {
        isAvailable: (explicitAvail === true || explicitAvail === false) ? explicitAvail : inferredAvail,
        startTime: firstSlotTime,
        endTime,
        breakStart: (row as any)?.break_start || '',
        breakEnd: (row as any)?.break_end || '',
        duration: firstSlotDuration,
        notes: (row as any)?.notes || ''
      };
    });

    return configs;
  };

  useEffect(() => {
    fetchCenters();
  }, [doctorId]);

  useEffect(() => {
    if (selectedCenterId) {
      // Clear initialization flag for the new center if it hasn't been initialized
      if (!initializedCenters.has(selectedCenterId)) {
        // This will trigger initialization in the next useEffect
      }
      fetchSchedule();
    }
  }, [selectedCenterId]);

  useEffect(() => {
    // Initialize day configs only after server schedule for this center has been fetched
    if (
      selectedCenterId &&
      !initializedCenters.has(selectedCenterId) &&
      lastFetchedCenterId === selectedCenterId
    ) {
      initializeDayConfigs();
    }
  }, [schedule, selectedCenterId, initializedCenters, lastFetchedCenterId]);

  const fetchCenters = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      // Try fallback route first for Vercel compatibility
      let response;
      try {
        console.log('🏥 Trying doctor-centers fallback route');
        response = await axios.get(
          `/api/doctor-centers`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      } catch (fallbackError) {
        console.log('❌ Fallback failed, trying dynamic route');
        response = await axios.get(
          `/api/doctor-dashboard/centers`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      if (response.data.success) {
        // ONLY show assigned centers in the Schedule tab
        const assignedCenters = response.data.assigned_centers || [];
        console.log('📅 [Schedule] Assigned centers:', assignedCenters.length);
        setCenters(assignedCenters);

        // Only set default selection if there are assigned centers
        if (assignedCenters.length > 0) {
          // Prefer persisted selection if valid
          const persistedSelection = selectionKey ? localStorage.getItem(selectionKey) : null;
          const isPersistedValid = persistedSelection && assignedCenters.some((c: Center) => c.id === persistedSelection);

          if (isPersistedValid) {
            setSelectedCenterId(persistedSelection as string);
          } else {
            // Set primary center as default selection
            const primaryCenter = assignedCenters.find((c: Center) => c.is_primary);
            if (primaryCenter) {
              setSelectedCenterId(primaryCenter.id);
            } else {
              setSelectedCenterId(assignedCenters[0].id);
            }
          }
        } else {
          // No assigned centers; stop loading so empty state can render
          setLoading(false);
        }
      }
    } catch (error) {
      console.error('Fetch centers error:', error);
      toast({
        title: t('error') || 'Error',
        description: t('dd_load_centers_failed') || 'Failed to load centers',
        variant: "destructive"
      });
      // Ensure loading stops on error as well
      setLoading(false);
    }
  };

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      console.log('📅 [Fetch Schedule] Starting fetch for center:', selectedCenterId);
      console.log('📅 [Fetch Schedule] Initialized centers:', Array.from(initializedCenters));

      if (!selectedCenterId) {
        console.log('📅 [Fetch Schedule] No center selected, skipping fetch');
        setSchedule([]);
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `/api/doctor-dashboard/schedule?center_id=${selectedCenterId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('📅 [Fetch Schedule] Response received:', response.data);

      if (response.data.success) {
        const rows: ScheduleData[] = response.data.schedule || [];
        console.log('📅 [Fetch Schedule] Schedule rows from DB:', rows.length);
        console.log('📅 [Fetch Schedule] Raw schedule data:', JSON.stringify(rows, null, 2));

        setSchedule(rows);

        // Always load from DB if center hasn't been initialized yet in this session
        // This ensures first visit to each center loads from database
        const shouldUpdateFromDB = !initializedCenters.has(selectedCenterId);
        console.log('📅 [Fetch Schedule] Should update from DB:', shouldUpdateFromDB);

        if (shouldUpdateFromDB) {
          console.log('📅 [Fetch Schedule] Building configs from schedule...');
          const newConfigs = buildConfigsFromSchedule(selectedCenterId, rows);
          console.log('📅 [Fetch Schedule] Built configs:', JSON.stringify(newConfigs, null, 2));

          setCenterFormStates(prev => {
            const updated = {
              ...prev,
              [selectedCenterId]: newConfigs
            };
            console.log('📅 [Fetch Schedule] Updated form states:', JSON.stringify(updated, null, 2));
            return updated;
          });

          setInitializedCenters(prev => {
            const updated = new Set([...prev, selectedCenterId]);
            console.log('📅 [Fetch Schedule] Updated initialized centers:', Array.from(updated));
            return updated;
          });
        } else {
          console.log('📅 [Fetch Schedule] Center already initialized, using existing form state');
          console.log('📅 [Fetch Schedule] Existing config:', JSON.stringify(centerFormStates[selectedCenterId], null, 2));
        }

        setLastFetchedCenterId(selectedCenterId);
        setHomeVisitsAvailable(response.data.home_visits_available || false);
        setDefaultConsultationFee(response.data.default_consultation_fee || 0);

        // Mark initial mount as complete after any fetch
        if (isInitialMount) {
          console.log('📅 [Fetch Schedule] Marking initial mount as complete');
          setIsInitialMount(false);
        }
      }
    } catch (error: any) {
      console.error('📅 [Fetch Schedule] Error:', error);
      console.error('📅 [Fetch Schedule] Error response:', error.response?.data);
      toast({
        title: t('error') || 'Error',
        description: error.response?.data?.error || (t('dd_load_schedule_failed') || 'Failed to load schedule'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSchedule = async () => {
    if (!selectedCenterId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');

      const response = await axios.get(
        `/api/doctor-dashboard/schedule?center_id=${selectedCenterId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        const rows: ScheduleData[] = response.data.schedule || [];
        setSchedule(rows);

        // Force update form configs from server when explicitly refreshing
        const newConfigs = buildConfigsFromSchedule(selectedCenterId, rows);
        setCenterFormStates(prev => ({
          ...prev,
          [selectedCenterId]: newConfigs
        }));

        // Keep the center as initialized
        setInitializedCenters(prev => new Set([...prev, selectedCenterId]));
        setLastFetchedCenterId(selectedCenterId);
        setHomeVisitsAvailable(response.data.home_visits_available || false);
        setDefaultConsultationFee(response.data.default_consultation_fee || 0);

        toast({
          title: t('success') || 'Success',
          description: t('dd_schedule_refreshed') || 'Schedule refreshed from server',
        });
      }
    } catch (error: any) {
      console.error('Refresh schedule error:', error);
      toast({
        title: t('error') || 'Error',
        description: error.response?.data?.error || (t('dd_load_schedule_failed') || 'Failed to load schedule'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDayConfig = (day: number, field: string, value: any) => {
    if (!selectedCenterId) return;

    setCenterFormStates(prev => ({
      ...prev,
      [selectedCenterId]: {
        ...prev[selectedCenterId],
        [day]: {
          ...prev[selectedCenterId]?.[day],
          [field]: value
        }
      }
    }));
  };

  // Persist selected center whenever it changes
  useEffect(() => {
    if (!doctorId) return;
    try {
      if (selectionKey && selectedCenterId) {
        localStorage.setItem(selectionKey, selectedCenterId);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [doctorId, selectedCenterId]);

  const generateSlotsForDay = (day: number): TimeSlot[] => {
    const config = getDayConfig(day);
    if (!config?.isAvailable || !config.startTime || !config.endTime) {
      return [];
    }

    return generateTimeSlots(
      config.startTime,
      config.endTime,
      config.breakStart || undefined,
      config.breakEnd || undefined,
      config.duration
    );
  };

  const saveSchedule = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('auth_token');

      if (!selectedCenterId) {
        toast({
          title: t('error') || 'Error',
          description: t('dd_select_center_first') || 'Please select a center first',
          variant: "destructive"
        });
        return;
      }

      console.log('📅 [Save Schedule] Starting save for center:', selectedCenterId);
      console.log('📅 [Save Schedule] Current form states:', centerFormStates);

      // Build schedule array for API - only include days that are marked as available
      const scheduleData = DAYS_OF_WEEK
        .filter(day => {
          const config = getDayConfig(day.value);
          console.log(`📅 [Save Schedule] Day ${day.value} (${day.labelKey}):`, {
            isAvailable: config.isAvailable,
            startTime: config.startTime,
            endTime: config.endTime,
            duration: config.duration
          });
          return config.isAvailable;
        })
        .map(day => {
          const config = getDayConfig(day.value);
          const slots = generateSlotsForDay(day.value);

          console.log(`📅 [Save Schedule] Generated ${slots.length} slots for day ${day.value}`);

          return {
            day_of_week: day.value,
            is_available: true,
            time_slots: slots,
            break_start: config?.breakStart || null,
            break_end: config?.breakEnd || null,
            notes: config?.notes || null
          };
        })
        .filter(day => {
          const hasSlots = day.time_slots.length > 0;
          if (!hasSlots) {
            console.log(`⚠️ [Save Schedule] Day ${day.day_of_week} excluded - no time slots generated`);
          }
          return hasSlots;
        });

      console.log('📅 [Save Schedule] Final schedule data to send:', JSON.stringify(scheduleData, null, 2));
      console.log('📅 [Save Schedule] Number of days with schedules:', scheduleData.length);

      const response = await axios.put(
        `/api/doctor-dashboard/schedule`,
        {
          schedule: scheduleData,
          center_id: selectedCenterId
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      console.log('📅 [Save Schedule] Response:', response.data);

      if (response.data.success) {
        // Update the schedule state with the response data
        setSchedule(response.data.schedule);

        toast({
          title: t('success') || 'Success',
          description: t('dd_schedule_updated') || 'Schedule updated successfully',
        });

        // Don't call fetchSchedule() again to avoid resetting the form
        // The form state should remain as the user configured it
      }
    } catch (error: any) {
      console.error('Save schedule error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);

      // Handle schedule conflict (409) with detailed message
      if (error.response?.status === 409) {
        console.log('🚨 DETECTED 409 CONFLICT - SHOWING DIALOG');
        const conflictData = error.response.data;

        // Set conflict message and details
        const message = conflictData.message || 'You cannot have overlapping time slots on the same day at different centers.';
        const conflicts = conflictData.conflicts || [];

        setConflictMessage(message);
        setConflictDetails(conflicts);
        setShowConflictDialog(true);
      } else {
        console.log('🚨 NON-409 ERROR - SHOWING GENERIC TOAST');
        // Generic error handling
        const errorMessage = error.response?.data?.error || error.response?.data?.message || (t('dd_save_schedule_failed') || 'Failed to save schedule');
        console.log('📢 Error message:', errorMessage);

        toast({
          title: t('error') || 'Error',
          description: errorMessage,
          variant: "destructive"
        });

        // Also try alert as backup
        setTimeout(() => {
          alert(`Error\n\n${errorMessage}`);
        }, 100);
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleHomeVisits = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      const response = await axios.put(
        `/api/doctor-dashboard/home-visits`,
        { home_visits_available: !homeVisitsAvailable },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setHomeVisitsAvailable(!homeVisitsAvailable);
        toast({
          title: (t('success') || 'Success'),
          description: (!homeVisitsAvailable
            ? (t('dd_home_visits_enabled') || 'Home visits enabled')
            : (t('dd_home_visits_disabled') || 'Home visits disabled')
          ),
        });

        // Refresh centers data after toggling home visits
        setTimeout(() => {
          fetchCenters();
          toast({
            title: (t('centers_updated') || 'Centers Updated'),
            description: (!homeVisitsAvailable
              ? (t('home_visit_center_added') || 'Home visit center has been added to your active centers')
              : (t('home_visit_center_removed') || 'Home visit center has been removed from your active centers')
            ),
          });
        }, 1000);
      }
    } catch (error: any) {
      console.error('Toggle home visits error:', error);
      toast({
        title: t('error') || 'Error',
        description: error.response?.data?.error || (t('dd_update_home_visits_failed') || 'Failed to update home visits setting'),
        variant: "destructive"
      });
    }
  };

  const copySchedule = (fromDay: number, toDay: number) => {
    if (!selectedCenterId) return;

    const sourceConfig = dayConfigs[fromDay];
    if (sourceConfig) {
      setCenterFormStates(prev => ({
        ...prev,
        [selectedCenterId]: {
          ...prev[selectedCenterId],
          [toDay]: { ...sourceConfig }
        }
      }));
    }
  };

  // Get only assigned centers for display
  const assignedCenters = centers.filter(c => c.is_assigned);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          <span>{t('dd_loading_schedule') || 'Loading schedule...'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Calendar className="h-5 w-5" />
          <h2 className="text-xl font-semibold">{t('dd_schedule_management') || 'Schedule Management'}</h2>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Button
            onClick={refreshSchedule}
            variant="outline"
            size="sm"
            disabled={loading || !selectedCenterId}
            className={isRTL ? 'flex-row-reverse' : ''}
          >
            <RotateCcw className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('dd_refresh') || 'Refresh'}
          </Button>
          <Button
            onClick={saveSchedule}
            disabled={saving || !selectedCenterId}
            size="sm"
            className={isRTL ? 'flex-row-reverse' : ''}
          >
            <Save className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {saving ? (t('dd_saving') || 'Saving...') : (t('dd_save_schedule') || 'Save Schedule')}
          </Button>
        </div>
      </div>

      {/* Center Selection */}
      <Card dir={isRTL ? 'rtl' : 'ltr'}>
        <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
          <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Building className="h-5 w-5" />
            {t('dd_center_selection') || 'Medical Center Selection'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className={isRTL ? 'text-right' : 'text-left'}>
              <Label className="text-base font-medium">{t('dd_select_center_manage') || 'Select Center to Manage Schedule'}</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('dd_center_selection_desc') || 'Choose which medical center you want to set your schedule for. You can only manage schedules for centers assigned to you.'}</p>
            </div>

            {assignedCenters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignedCenters.map(center => (
                  <div
                    key={center.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedCenterId === center.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    onClick={() => {
                      setSelectedCenterId(center.id);
                    }}
                  >
                    <div className={`flex items-start justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                        <h3 className="font-medium text-sm">{getLocalizedCenterName(center)}</h3>
                        <div className={`flex items-center gap-1 mt-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <MapPin className="h-3 w-3 text-gray-500" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {center.address}
                          </p>
                        </div>
                        {center.is_primary && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            {t('dd_primary') || 'Primary'}
                          </Badge>
                        )}
                      </div>
                      {selectedCenterId === center.id && (
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Building className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <div className="space-y-2">
                  <p className="text-gray-600 dark:text-gray-400">{t('dd_no_centers_assigned_title') || 'No centers assigned to you yet.'}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{t('dd_no_centers_assigned_desc') || 'Please go to the "Centers" tab to select which medical centers you want to work at, then return here to set your schedule.'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedCenterId && (
        <>
          {/* Home Visits Setting */}
          <Card dir={isRTL ? 'rtl' : 'ltr'}>
            <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Home className="h-5 w-5" />
                {t('dd_home_visits') || 'Home Visits'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <Label className="text-base font-medium">{t('dd_accept_home_visits') || 'Accept Home Visit Appointments'}</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('dd_home_visits_desc') || 'Enable this to allow patients to book home visit appointments with you'}</p>
                </div>
                <Switch
                  checked={homeVisitsAvailable}
                  onCheckedChange={toggleHomeVisits}
                />
              </div>
            </CardContent>
          </Card>

          {/* Weekly Schedule */}
          <Card dir={isRTL ? 'rtl' : 'ltr'}>
            <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Clock className="h-5 w-5" />
                {(t('dd_weekly_schedule_for') || 'Weekly Schedule for')} {(() => {
                  const center = centers.find(c => c.id === selectedCenterId);
                  return center ? getLocalizedCenterName(center) : '';
                })()}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {DAYS_OF_WEEK.map(day => {
                const config = getDayConfig(day.value);
                const slots = generateSlotsForDay(day.value);

                return (
                  <div key={day.value} className="space-y-4 p-4 border rounded-lg">
                    {/* Day Header */}
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <h3 className="text-lg font-medium">{t((day as any).labelKey) || (day as any).labelKey}</h3>
                      <Switch
                        checked={config.isAvailable || false}
                        onCheckedChange={(checked) => updateDayConfig(day.value, 'isAvailable', checked)}
                      />
                    </div>

                    {config.isAvailable && (
                      <div className="space-y-4 ml-4">
                        {/* Time Range */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label>{t('dd_start_time') || 'Start Time'}</Label>
                            <Input
                              type="time"
                              value={config.startTime || '09:00'}
                              onChange={(e) => updateDayConfig(day.value, 'startTime', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>{t('dd_end_time') || 'End Time'}</Label>
                            <Input
                              type="time"
                              value={config.endTime || '17:00'}
                              onChange={(e) => updateDayConfig(day.value, 'endTime', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>{t('dd_slot_duration_minutes') || 'Slot Duration (minutes)'}</Label>
                            <Input
                              type="number"
                              min="15"
                              max="120"
                              step="15"
                              value={config.duration || 30}
                              onChange={(e) => updateDayConfig(day.value, 'duration', parseInt(e.target.value))}
                            />
                          </div>
                        </div>

                        {/* Break Time */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>{t('dd_break_start_optional') || 'Break Start (optional)'}</Label>
                            <Input
                              type="time"
                              value={config.breakStart || ''}
                              onChange={(e) => updateDayConfig(day.value, 'breakStart', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>{t('dd_break_end_optional') || 'Break End (optional)'}</Label>
                            <Input
                              type="time"
                              value={config.breakEnd || ''}
                              onChange={(e) => updateDayConfig(day.value, 'breakEnd', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Generated Slots Preview */}
                        {slots.length > 0 && (
                          <div className={isRTL ? 'text-right' : 'text-left'}>
                            <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                              {(t('dd_generated_time_slots_total') || 'Generated Time Slots ({count} total)').replace('{count}', toArabicNumerals(slots.length))}
                            </Label>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {slots.slice(0, 8).map((slot, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {slot.time}
                                </Badge>
                              ))}
                              {slots.length > 8 && (
                                <Badge variant="secondary" className="text-xs">
                                  {(t('dd_more_count') || '+{count} more').replace('{count}', toArabicNumerals(slots.length - 8))}
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Copy from other days */}
                        <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span className="text-sm text-gray-600 dark:text-gray-400">{t('dd_copy_from') || 'Copy from:'}</span>
                          {DAYS_OF_WEEK.filter(d => d.value !== day.value && dayConfigs[d.value]?.isAvailable).map(sourceDay => (
                            <Button
                              key={sourceDay.value}
                              variant="outline"
                              size="sm"
                              onClick={() => copySchedule(sourceDay.value, day.value)}
                              className="text-xs"
                            >
                              {t((sourceDay as any).labelKey) || (sourceDay as any).labelKey}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Schedule Summary */}
          <Card dir={isRTL ? 'rtl' : 'ltr'}>
            <CardHeader className={isRTL ? 'text-right' : 'text-left'}>
              <CardTitle className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CheckCircle className="h-5 w-5" />
                {t('dd_schedule_summary') || 'Schedule Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_working_days') || 'Working Days'}</Label>
                  <p className="text-lg font-semibold">{toArabicNumerals(Object.values(dayConfigs).filter(config => config.isAvailable).length)} {t('days') || 'days'}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_total_weekly_slots') || 'Total Weekly Slots'}</Label>
                  <p className="text-lg font-semibold">{toArabicNumerals(DAYS_OF_WEEK.reduce((total, day) => total + generateSlotsForDay(day.value).length, 0))} {t('slots') || 'slots'}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_home_visits') || 'Home Visits'}</Label>
                  <p className="text-lg font-semibold">{homeVisitsAvailable ? (t('dd_available') || 'Available') : (t('dd_not_available') || 'Not Available')}</p>
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('dd_default_fee') || 'Default Fee'}</Label>
                  <p className="text-lg font-semibold">{formatCurrency(defaultConsultationFee, locale, locale === 'ar' ? 'ل.س' : 'SYP')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Conflict Alert Dialog */}
      <AlertDialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
              <span>⚠️</span>
              <span>{t('schedule_conflict') || 'Schedule Conflict'}</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">{conflictMessage}</p>

              {conflictDetails.length > 0 && (
                <div className="space-y-2">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {t('conflict_details') || 'Conflict Details:'}
                  </p>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                    {conflictDetails.map((conflict, index) => (
                      <div key={index} className="flex items-start gap-2 text-sm">
                        <span className="text-red-500 mt-0.5">•</span>
                        <span className="text-gray-700 dark:text-gray-300">{conflict}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('schedule_conflict_instruction') || 'Please adjust your schedule to avoid overlapping time slots on the same day at different centers.'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowConflictDialog(false)}
              className="bg-primary hover:bg-primary/90"
            >
              {t('understood') || 'Understood'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
