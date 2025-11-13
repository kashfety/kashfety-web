import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');
    const typeId = searchParams.get('typeId');
    const date = searchParams.get('date');
    const excludeBookingId = searchParams.get('exclude_booking_id'); // For rescheduling

    if (!centerId || !typeId || !date) {
      return NextResponse.json({ 
        success: false, 
        error: 'Center ID, Type ID, and date are required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse the date to get day of week
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    console.log('🔍 [Lab Available Slots] Fetching slots for:', { centerId, typeId, date, dayOfWeek });

    // Get lab schedule for this center, test type, and day of week
    const { data: schedule, error: scheduleError } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .maybeSingle();

    if (scheduleError) {
      console.error('❌ Failed to fetch lab schedule:', scheduleError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch lab schedule' 
      }, { status: 500 });
    }

    let timeSlots = [];
    
    if (!schedule) {
      console.log('⚠️ No schedule found, using default time slots (8 AM - 4 PM)');
      
      // Generate default time slots: 8:00 AM to 4:00 PM, every 30 minutes
      const defaultSlots = [];
      for (let hour = 8; hour < 16; hour++) {
        defaultSlots.push(`${String(hour).padStart(2, '0')}:00`);
        defaultSlots.push(`${String(hour).padStart(2, '0')}:30`);
      }
      timeSlots = defaultSlots;
    } else {
      // Parse time_slots from schedule
      timeSlots = schedule.time_slots;
      if (typeof timeSlots === 'string') {
        try {
          timeSlots = JSON.parse(timeSlots);
        } catch (e) {
          console.error('Failed to parse time_slots JSON:', e);
          // Use default slots as fallback
          const defaultSlots = [];
          for (let hour = 8; hour < 16; hour++) {
            defaultSlots.push(`${String(hour).padStart(2, '0')}:00`);
            defaultSlots.push(`${String(hour).padStart(2, '0')}:30`);
          }
          timeSlots = defaultSlots;
        }
      }

      if (!Array.isArray(timeSlots)) {
        timeSlots = [];
      }
    }

    console.log('📅 Time slots to use:', timeSlots);

    // Get booked slots for this date
    let bookingsQuery = supabase
      .from('lab_bookings')
      .select('id, booking_time, status')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('booking_date', date)
      .in('status', ['scheduled', 'confirmed', 'in_progress']);
    
    // Exclude the current booking if rescheduling
    if (excludeBookingId) {
      bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
    }
    
    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('❌ Failed to fetch bookings:', bookingsError);
    }

    const bookedTimes = new Set((bookings || []).map(b => b.booking_time));
    console.log('🔒 Booked times:', Array.from(bookedTimes));

    // Map slots to include availability
    const availableSlots = timeSlots.map((slot: any) => {
      const time = typeof slot === 'string' ? slot : slot.time;
      const isBooked = bookedTimes.has(time) || bookedTimes.has(`${time}:00`);
      
      return {
        time,
        is_available: !isBooked,
        is_booked: isBooked
      };
    });

    console.log('✅ [Lab Available Slots] Returning', availableSlots.length, 'slots');

    return NextResponse.json({
      success: true,
      data: {
        available_slots: availableSlots,
        date,
        center_id: centerId,
        lab_test_type_id: typeId
      }
    });

  } catch (error: any) {
    console.error('❌ Lab available slots API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

