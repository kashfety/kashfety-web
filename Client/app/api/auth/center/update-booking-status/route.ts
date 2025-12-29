import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(request: NextRequest) {
  try {
    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json({ error: 'Booking ID and status are required' }, { status: 400 });
    }

    // Update booking status in lab_bookings table
    const { data, error } = await supabase
      .from('lab_bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Booking ${status} successfully`,
      booking: data
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
