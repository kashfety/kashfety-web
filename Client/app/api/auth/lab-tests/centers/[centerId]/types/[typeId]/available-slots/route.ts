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


    if (!centerId || !typeId || !date) {
      return NextResponse.json({ error: 'Center ID, Type ID, and date are required' }, { status: 400 });
    }

    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

    // Get lab schedule for this center, test type, and day
    const { data: schedule, error: scheduleError } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .maybeSingle();

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to fetch lab schedule' }, { status: 500 });
    }


    if (!schedule) {
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
      return NextResponse.json({ error: 'Failed to fetch lab bookings' }, { status: 500 });
    }

    const bookedTimes = (bookings || []).map((b: any) => b.booking_time?.slice(0, 5));

    // Process available slots from schedule
    let timeSlots = schedule.time_slots;
    
    if (typeof timeSlots === 'string') {
      try {
        timeSlots = JSON.parse(timeSlots);
      } catch (e) {
        timeSlots = [];
      }
    }
    
    const rawSlots: any[] = Array.isArray(timeSlots) ? timeSlots : [];
    
    const availableSlots = rawSlots
      .map((slot: any) => {
        const time = typeof slot === 'string' ? slot : (slot.time || slot.start_time || slot.slot_time);
        return {
          time: time?.slice(0, 5), // Ensure HH:MM format
          is_available: !bookedTimes.includes(time?.slice(0, 5)),
          duration: slot.duration || schedule.slot_duration || 30
        };
      })
      .filter((slot: any) => slot.time);


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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
