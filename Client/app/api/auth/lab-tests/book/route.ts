import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { patient_id, center_id, lab_test_type_id, booking_date, booking_time, notes, duration, fee } = await request.json();

    if (!patient_id || !center_id || !lab_test_type_id || !booking_date || !booking_time) {
      return NextResponse.json({ 
        error: 'Patient ID, center ID, lab test type ID, booking date, and booking time are required' 
      }, { status: 400 });
    }

    // Create the lab booking
    const { data, error } = await supabase
      .from('lab_bookings')
      .insert({
        patient_id,
        center_id,
        lab_test_type_id,
        booking_date,
        booking_time,
        status: 'scheduled',
        notes,
        duration: duration || 30,
        fee: fee || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        users(id, first_name, last_name, phone, email),
        centers(id, name, address, phone),
        lab_test_types(id, name, description, category)
      `)
      .single();

    if (error) {
      console.error('Failed to create lab booking:', error);
      return NextResponse.json({ error: 'Failed to create lab booking' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lab test booked successfully',
      booking: data
    });

  } catch (error) {
    console.error('Lab booking API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
