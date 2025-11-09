import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('🔬 [Lab Booking API] Request received');
    
    const { patient_id, center_id, lab_test_type_id, booking_date, booking_time, notes, duration, fee } = await request.json();

    console.log('🔬 Request data:', { patient_id, center_id, lab_test_type_id, booking_date, booking_time });

    if (!patient_id || !center_id || !lab_test_type_id || !booking_date || !booking_time) {
      console.log('❌ Missing required fields');
      return NextResponse.json({ 
        success: false,
        error: 'Patient ID, center ID, lab test type ID, booking date, and booking time are required' 
      }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for existing booking at this time slot
    console.log('🔍 Checking for existing lab booking...');
    const { data: existing } = await supabaseAdmin
      .from('lab_bookings')
      .select('id, status')
      .eq('center_id', center_id)
      .eq('lab_test_type_id', lab_test_type_id)
      .eq('booking_date', booking_date)
      .eq('booking_time', booking_time)
      .in('status', ['scheduled', 'confirmed', 'in_progress'])
      .maybeSingle();

    if (existing) {
      console.log('❌ Time slot already taken:', existing);
      return NextResponse.json({
        success: false,
        error: 'This time slot is already booked'
      }, { status: 409 });
    }

    // Create the lab booking
    console.log('💾 Creating lab booking...');
    const { data, error } = await supabaseAdmin
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
      console.error('❌ Database error:', error);
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create lab booking',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ Lab booking created:', data);
    return NextResponse.json({
      success: true,
      message: 'Lab test booked successfully',
      booking: data
    });

  } catch (error: any) {
    console.error('❌ Lab booking API error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
