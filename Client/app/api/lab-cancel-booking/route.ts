import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const { reason } = await request.json();

    console.log('🔬 [Lab Cancel] Request:', { bookingId, reason });

    if (!bookingId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Booking ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, check if the booking exists
    const { data: booking, error: fetchError } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, status, booking_date, booking_time')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('❌ Booking not found:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    // Check if booking is already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json({ 
        success: false, 
        error: 'Booking is already cancelled' 
      }, { status: 400 });
    }

    // Check if booking is completed
    if (booking.status === 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot cancel a completed booking' 
      }, { status: 400 });
    }

    // Check if cancellation is within 24 hours of booking time
    if (booking.booking_date && booking.booking_time) {
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.booking_time}`);
      const now = new Date();
      const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      console.log('⏰ [Lab Cancel] Time check:', {
        bookingDateTime: bookingDateTime.toISOString(),
        now: now.toISOString(),
        hoursUntilBooking: hoursUntilBooking.toFixed(2)
      });

      if (hoursUntilBooking <= 24 && hoursUntilBooking > 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot cancel booking within 24 hours of the scheduled time. Please contact support for assistance.',
          code: 'CANCELLATION_TOO_LATE'
        }, { status: 400 });
      }

      // Also check if booking is in the past
      if (hoursUntilBooking < 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Cannot cancel a past booking',
          code: 'BOOKING_IN_PAST'
        }, { status: 400 });
      }
    }

    // Update the booking status to cancelled
    console.log('💾 Cancelling booking...');
    const { data: updatedBooking, error: updateError } = await supabase
      .from('lab_bookings')
      .update({
        status: 'cancelled',
        notes: reason ? `Cancellation reason: ${reason}` : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select(`
        *,
        center:centers(id, name, address, phone),
        lab_test_type:lab_test_types(id, name, category, description)
      `)
      .single();

    if (updateError) {
      console.error('❌ Failed to cancel booking:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to cancel booking',
        details: updateError.message 
      }, { status: 500 });
    }

    // Enrich the response
    const enrichedBooking = {
      ...updatedBooking,
      type: updatedBooking.lab_test_type
    };

    console.log('✅ [Lab Cancel] Booking cancelled successfully');
    return NextResponse.json({
      success: true,
      message: 'Lab booking cancelled successfully',
      booking: enrichedBooking
    });

  } catch (error: any) {
    console.error('❌ Lab cancel error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

