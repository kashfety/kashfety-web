import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const { reason } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // First, check if the booking exists and belongs to the authenticated user
    const { data: booking, error: fetchError } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, status, booking_date, booking_time')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 });
    }

    // Check if booking is completed
    if (booking.status === 'completed') {
      return NextResponse.json({ error: 'Cannot cancel a completed booking' }, { status: 400 });
    }

    // Check if cancellation is within 24 hours of booking time
    if (booking.booking_date && booking.booking_time) {
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
      const now = new Date();
      const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      console.log('⏰ [Lab Cancel Dynamic] Time check:', {
        bookingDateTime: bookingDateTime.toISOString(),
        now: now.toISOString(),
        hoursUntilBooking: hoursUntilBooking.toFixed(2)
      });

      if (hoursUntilBooking <= 24 && hoursUntilBooking > 0) {
        return NextResponse.json({ 
          error: 'Cannot cancel booking within 24 hours of the scheduled time. Please contact support for assistance.',
          code: 'CANCELLATION_TOO_LATE'
        }, { status: 400 });
      }

      // Also check if booking is in the past
      if (hoursUntilBooking < 0) {
        return NextResponse.json({ 
          error: 'Cannot cancel a past booking',
          code: 'BOOKING_IN_PAST'
        }, { status: 400 });
      }
    }

    // Update the booking status to cancelled
    const { data: updatedBooking, error: updateError } = await supabase
      .from('lab_bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}