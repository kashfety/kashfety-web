import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const { newDate, newTime, reason } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    if (!newDate || !newTime) {
      return NextResponse.json({ error: 'New date and time are required' }, { status: 400 });
    }

    // First, check if the booking exists and belongs to the authenticated user
    const { data: booking, error: fetchError } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, status, booking_date, center_id, lab_test_type_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking can be rescheduled
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Cannot reschedule a cancelled booking' }, { status: 400 });
    }

    if (booking.status === 'completed') {
      return NextResponse.json({ error: 'Cannot reschedule a completed booking' }, { status: 400 });
    }

    // Check if the new time slot is available
    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('lab_bookings')
      .select('id')
      .eq('center_id', booking.center_id)
      .eq('booking_date', newDate)
      .eq('booking_time', newTime)
      .neq('status', 'cancelled')
      .neq('id', bookingId);

    if (conflictError) {
      console.error('Error checking for conflicts:', conflictError);
      return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 });
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return NextResponse.json({ error: 'The selected time slot is not available' }, { status: 409 });
    }

    // Update the booking with new date and time
    const { data: updatedBooking, error: updateError } = await supabase
      .from('lab_bookings')
      .update({
        booking_date: newDate,
        booking_time: newTime,
        updated_at: new Date().toISOString(),
        status: 'confirmed' // Reset status to confirmed after reschedule
      })
      .eq('id', bookingId)
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        duration,
        notes,
        fee,
        created_at,
        centers:center_id(
          id,
          name,
          address,
          phone
        ),
        lab_test_types:lab_test_type_id(
          id,
          name,
          category,
          description,
          default_duration
        )
      `)
      .single();

    if (updateError) {
      console.error('Failed to reschedule booking:', updateError);
      return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Booking rescheduled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error rescheduling booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}