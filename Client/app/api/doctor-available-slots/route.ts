import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { toWesternNumerals } from '@/lib/i18n';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** Normalize date to YYYY-MM-DD with Western numerals and parse day of week in a timezone-safe way */
function normalizeDateAndGetDay(dateParam: string | null): { dateStr: string; dayOfWeek: number } | null {
  if (!dateParam || typeof dateParam !== 'string') return null;
  const normalized = toWesternNumerals(dateParam.trim());
  const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = parseInt(y!, 10);
  const month = parseInt(m!, 10) - 1;
  const day = parseInt(d!, 10);
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) return null;
  const requestedDate = new Date(year, month, day);
  const dayOfWeek = requestedDate.getDay();
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { dateStr, dayOfWeek };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const dateParam = searchParams.get('date');
    const centerId = searchParams.get('center_id');

    if (!doctorId || !dateParam) {
      return NextResponse.json({
        success: false,
        message: 'Doctor ID and date are required'
      }, { status: 400 });
    }

    const parsed = normalizeDateAndGetDay(dateParam);
    if (!parsed) {
      return NextResponse.json({ success: false, message: 'Invalid date format. Use YYYY-MM-DD.' }, { status: 400 });
    }
    const { dateStr: date, dayOfWeek } = parsed;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, message: 'Server configuration error' }, { status: 500 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get appointment_type if provided
    const appointmentType = searchParams.get('appointment_type');
    
    // Build the query - use doctor_schedules with centers join for complete schedule info
    let query = supabase
      .from('doctor_schedules')
      .select(`
        day_of_week,
        is_available,
        time_slots,
        consultation_fee,
        center_id,
        centers(name)
      `)
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    // Fetch all matching schedules first
    const { data: allSchedules, error: scheduleError } = await query;
    
    // Filter schedules based on appointment type and center
    let schedules = null;
    if (appointmentType === 'home_visit') {
      // Find schedule for home visit (center name ends with "- Home Visit Schedule")
      schedules = (allSchedules || []).filter((s: any) => 
        s.centers?.name && s.centers.name.endsWith('- Home Visit Schedule')
      );
    } else if (centerId) {
      // For clinic, find schedules matching center_id
      schedules = (allSchedules || []).filter((s: any) => s.center_id === centerId);
    } else {
      // If no center_id specified, use all non-home-visit schedules (for legacy appointments)
      schedules = (allSchedules || []).filter((s: any) => 
        !s.centers?.name || !s.centers.name.endsWith('- Home Visit Schedule')
      );
    }

    if (scheduleError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch doctor schedules' 
      }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      
      // Generate default time slots (9 AM to 5 PM) when no schedule exists
      const defaultSlots: Array<{time: string, is_available: boolean, is_booked: boolean}> = [];
      
      // Get booked appointments even if there's no schedule
      const excludeAppointmentId = searchParams.get('exclude_appointment_id');
      
      let appointmentsQuery = supabase
        .from('appointments')
        .select('appointment_time, status, center_id')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed', 'scheduled']);
      
      if (excludeAppointmentId) {
        appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
      }
      
      const { data: appointments, error: appointmentsError } = await appointmentsQuery;

      if (appointmentsError) {
      }

      // Filter appointments by center if center_id is provided
      const filteredAppointments = (appointments || []).filter((apt: any) => {
        if (!centerId) return true;
        return apt.center_id == null || apt.center_id === centerId;
      });
      
      const bookedTimes = new Set(filteredAppointments.map((apt: any) => {
        const time = apt.appointment_time;
        return typeof time === 'string' ? time.slice(0, 5) : time;
      }));

      // Generate slots from 9 AM to 5 PM (default business hours)
      for (let hour = 9; hour < 17; hour++) {
        for (let minute of [0, 30]) {
          const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
          const isBooked = bookedTimes.has(timeStr) || bookedTimes.has(`${timeStr}:00`);
          
          defaultSlots.push({
            time: timeStr,
            is_available: !isBooked,
            is_booked: isBooked
          });
        }
      }


      return NextResponse.json({ 
        success: true, 
        slots: defaultSlots 
      });
    }

    // Get booked appointments for this date
    // Also check for exclude_appointment_id parameter (for rescheduling)
    const excludeAppointmentId = searchParams.get('exclude_appointment_id');
    
    let appointmentsQuery = supabase
      .from('appointments')
      .select('appointment_time, status, center_id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed', 'scheduled']);
    
    // Exclude the current appointment if rescheduling
    if (excludeAppointmentId) {
      appointmentsQuery = appointmentsQuery.neq('id', excludeAppointmentId);
    }
    
    const { data: appointments, error: appointmentsError } = await appointmentsQuery;

    if (appointmentsError) {
    }

    // Filter appointments by center if center_id is provided (for clinic visits)
    const filteredAppointments = (appointments || []).filter((apt: any) => {
      if (!centerId) return true;
      // Treat null/undefined center_id as matching any center to avoid missing legacy rows
      return apt.center_id == null || apt.center_id === centerId;
    });
    
    const bookedTimes = new Set(filteredAppointments.map((apt: any) => {
      const time = apt.appointment_time;
      // Normalize to HH:MM format
      return typeof time === 'string' ? time.slice(0, 5) : time;
    }));

    // Generate time slots
    const slots: Array<{time: string, is_available: boolean, is_booked: boolean}> = [];

    for (const schedule of schedules) {
      // Use the time_slots array from the schedule
      if (schedule.time_slots && Array.isArray(schedule.time_slots) && schedule.time_slots.length > 0) {
        // Use the time_slots array from the schedule
        for (const slot of schedule.time_slots) {
          const timeStr = slot.time || slot;
          const isBooked = bookedTimes.has(timeStr) || bookedTimes.has(`${timeStr}:00`);
          
          slots.push({
            time: timeStr,
            is_available: !isBooked,
            is_booked: isBooked
          });
        }
      }
      // Note: If time_slots is empty or missing, skip this schedule
      // The schema uses time_slots as the primary field, so no fallback needed
    }

    // Remove duplicates and sort
    const uniqueSlots = Array.from(
      new Map(slots.map(slot => [slot.time, slot])).values()
    ).sort((a, b) => a.time.localeCompare(b.time));


    return NextResponse.json({ 
      success: true, 
      available_slots: uniqueSlots,
      slots: uniqueSlots, // Support both formats
      booked_slots: Array.from(bookedTimes),
      date,
      doctor_id: doctorId
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

