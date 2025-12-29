import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const date = searchParams.get('date');
    const centerId = searchParams.get('center_id');


    if (!doctorId || !date) {
      return NextResponse.json({ 
        success: false, 
        message: 'Doctor ID and date are required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse the date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

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
      // First check if time_slots field exists (new format)
      if (schedule.time_slots && Array.isArray(schedule.time_slots)) {
        
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
      } else {
        // Fallback to start_time/end_time if time_slots not available
        const startTime = schedule.start_time;
        const endTime = schedule.end_time;
        
        if (!startTime || !endTime) continue;


        // Parse times (format: "HH:MM:SS" or "HH:MM")
        const [startHour, startMinute] = startTime.split(':').map(Number);
        const [endHour, endMinute] = endTime.split(':').map(Number);

        let currentHour = startHour;
        let currentMinute = startMinute;

        while (
          currentHour < endHour ||
          (currentHour === endHour && currentMinute < endMinute)
        ) {
          const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
          const isBooked = bookedTimes.has(timeStr) || bookedTimes.has(`${timeStr}:00`);

          slots.push({
            time: timeStr,
            is_available: !isBooked,
            is_booked: isBooked
          });

          // Increment by 30 minutes
          currentMinute += 30;
          if (currentMinute >= 60) {
            currentMinute -= 60;
            currentHour += 1;
          }
        }
      }
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

