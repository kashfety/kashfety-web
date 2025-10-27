import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
      .select('id, patient_id, status, booking_date')
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
      console.error('Failed to cancel booking:', updateError);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Booking cancelled successfully',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}