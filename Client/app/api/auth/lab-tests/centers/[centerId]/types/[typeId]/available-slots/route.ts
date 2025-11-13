import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string; typeId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const excludeBookingId = searchParams.get('exclude_booking_id'); // For rescheduling
    const { centerId, typeId } = await params;

    console.log('🔍 Lab available slots request:', { centerId, typeId, date });

    if (!centerId || !typeId || !date) {
      return NextResponse.json({ error: 'Center ID, Type ID, and date are required' }, { status: 400 });
    }

    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    console.log('📅 Calculated day of week:', { date, dayOfWeek });

    // Get lab schedule for this center, test type, and day
    console.log('🔍 Querying lab schedule with:', { centerId, typeId, dayOfWeek });
    const { data: schedule, error: scheduleError } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .maybeSingle();

    if (scheduleError) {
      console.error('Failed to fetch lab schedule:', scheduleError);
      return NextResponse.json({ error: 'Failed to fetch lab schedule' }, { status: 500 });
    }

    console.log('📅 Found schedule:', schedule);

    if (!schedule) {
      console.log('❌ No schedule found for this day');
      return NextResponse.json({
        success: true,
        available_slots: [],
        booked_slots: [],
        date,
        message: 'No schedule available for this day'
      });
    }

    // Get existing bookings for this date, center, and test type
    let bookingsQuery = supabase
      .from('lab_bookings')
      .select('id, booking_time')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('booking_date', date)
      .in('status', ['scheduled', 'confirmed']);
    
    // Exclude the current booking if rescheduling
    if (excludeBookingId) {
      bookingsQuery = bookingsQuery.neq('id', excludeBookingId);
    }
    
    const { data: bookings, error: bookingsError } = await bookingsQuery;

    if (bookingsError) {
      console.error('Failed to fetch lab bookings:', bookingsError);
      return NextResponse.json({ error: 'Failed to fetch lab bookings' }, { status: 500 });
    }

    const bookedTimes = (bookings || []).map((b: any) => b.booking_time?.slice(0, 5));
    console.log('🔄 Booked times:', bookedTimes);

    // Process available slots from schedule
    let timeSlots = schedule.time_slots;
    console.log('🔄 Raw time_slots from DB:', timeSlots, typeof timeSlots);
    
    if (typeof timeSlots === 'string') {
      try {
        timeSlots = JSON.parse(timeSlots);
        console.log('🔄 Parsed time_slots:', timeSlots);
      } catch (e) {
        console.log('❌ Failed to parse time_slots:', e);
        timeSlots = [];
      }
    }
    
    const rawSlots: any[] = Array.isArray(timeSlots) ? timeSlots : [];
    console.log('🔄 Raw slots array:', rawSlots);
    
    const availableSlots = rawSlots
      .map((slot: any) => {
        const time = typeof slot === 'string' ? slot : (slot.time || slot.start_time || slot.slot_time);
        console.log('🔄 Processing slot:', slot, '-> time:', time);
        return {
          time: time?.slice(0, 5), // Ensure HH:MM format
          is_available: !bookedTimes.includes(time?.slice(0, 5)),
          duration: slot.duration || schedule.slot_duration || 30
        };
      })
      .filter((slot: any) => slot.time);

    console.log('✅ Final available slots:', availableSlots);

    return NextResponse.json({
      success: true,
      available_slots: availableSlots,
      booked_slots: bookedTimes,
      date,
      center_id: centerId,
      lab_test_type_id: typeId,
      slot_duration: schedule.slot_duration || 30
    });

  } catch (error) {
    console.error('Lab available slots API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
