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

    console.log('🕐 [Doctor Available Slots API] Request - Doctor:', doctorId, 'Date:', date, 'Center:', centerId);

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

    // Build the query - use doctor_schedule_view for complete schedule info
    let query = supabase
      .from('doctor_schedule_view')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    // Only filter by center_id if it's provided (clinic visits)
    if (centerId) {
      query = query.eq('center_id', centerId);
    }

    const { data: schedules, error: scheduleError } = await query;

    if (scheduleError) {
      console.error('🕐 Error fetching schedules:', scheduleError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch doctor schedules' 
      }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      console.log('🕐 No schedules found for this doctor on this day - using default schedule');
      
      // Generate default time slots (9 AM to 5 PM) when no schedule exists
      const defaultSlots: Array<{time: string, is_available: boolean, is_booked: boolean}> = [];
      
      // Get booked appointments even if there's no schedule
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('appointment_time, status')
        .eq('doctor_id', doctorId)
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed']);

      if (appointmentsError) {
        console.error('🕐 Error fetching appointments:', appointmentsError);
      }

      const bookedTimes = new Set((appointments || []).map(apt => apt.appointment_time));

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

      console.log(`🕐 Generated ${defaultSlots.length} default slots for doctor ${doctorId} on ${date}`);

      return NextResponse.json({ 
        success: true, 
        slots: defaultSlots 
      });
    }

    // Get booked appointments for this date
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed']);

    if (appointmentsError) {
      console.error('🕐 Error fetching appointments:', appointmentsError);
    }

    const bookedTimes = new Set((appointments || []).map(apt => apt.appointment_time));

    // Generate time slots
    const slots: Array<{time: string, is_available: boolean, is_booked: boolean}> = [];

    for (const schedule of schedules) {
      // First check if time_slots field exists (new format)
      if (schedule.time_slots && Array.isArray(schedule.time_slots)) {
        console.log('🕐 Using time_slots from schedule:', schedule.time_slots);
        
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

        console.log('🕐 Using start_time/end_time:', startTime, '-', endTime);

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

    console.log(`🕐 Generated ${uniqueSlots.length} slots for doctor ${doctorId} on ${date}`);

    return NextResponse.json({ 
      success: true, 
      slots: uniqueSlots 
    });
  } catch (error: any) {
    console.error('🕐 Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

