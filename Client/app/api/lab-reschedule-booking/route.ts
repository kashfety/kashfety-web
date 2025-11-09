import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    const { newDate, newTime, reason } = await request.json();

    console.log('🔬 [Lab Reschedule] Request:', { bookingId, newDate, newTime });

    if (!bookingId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Booking ID is required' 
      }, { status: 400 });
    }

    if (!newDate || !newTime) {
      return NextResponse.json({ 
        success: false, 
        error: 'New date and time are required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, check if the booking exists
    const { data: booking, error: fetchError } = await supabase
      .from('lab_bookings')
      .select('id, patient_id, status, booking_date, center_id, lab_test_type_id')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.error('❌ Booking not found:', fetchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    // Check if booking can be rescheduled
    if (booking.status === 'cancelled') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot reschedule a cancelled booking' 
      }, { status: 400 });
    }

    if (booking.status === 'completed') {
      return NextResponse.json({ 
        success: false, 
        error: 'Cannot reschedule a completed booking' 
      }, { status: 400 });
    }

    // Check if the new time slot is available
    console.log('🔍 Checking slot availability...');
    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('lab_bookings')
      .select('id')
      .eq('center_id', booking.center_id)
      .eq('lab_test_type_id', booking.lab_test_type_id)
      .eq('booking_date', newDate)
      .eq('booking_time', newTime)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .neq('id', bookingId);

    if (conflictError) {
      console.error('❌ Error checking conflicts:', conflictError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to check availability' 
      }, { status: 500 });
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      console.log('❌ Time slot already taken');
      return NextResponse.json({ 
        success: false, 
        error: 'The selected time slot is not available' 
      }, { status: 409 });
    }

    // Update the booking with new date and time
    console.log('💾 Rescheduling booking...');
    const { data: updatedBooking, error: updateError } = await supabase
      .from('lab_bookings')
      .update({
        booking_date: newDate,
        booking_time: newTime,
        updated_at: new Date().toISOString(),
        status: 'scheduled'
      })
      .eq('id', bookingId)
      .select(`
        *,
        center:centers(id, name, address, phone),
        lab_test_type:lab_test_types(id, name, category, description)
      `)
      .single();

    if (updateError) {
      console.error('❌ Failed to reschedule booking:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to reschedule booking',
        details: updateError.message 
      }, { status: 500 });
    }

    // Enrich the response
    const enrichedBooking = {
      ...updatedBooking,
      type: updatedBooking.lab_test_type
    };

    console.log('✅ [Lab Reschedule] Booking rescheduled successfully');
    return NextResponse.json({
      success: true,
      message: 'Lab booking rescheduled successfully',
      booking: enrichedBooking
    });

  } catch (error: any) {
    console.error('❌ Lab reschedule error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

