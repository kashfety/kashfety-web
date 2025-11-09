import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    console.log('🔬 [My Lab Bookings] Fetching bookings for patient:', patientId);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get lab bookings for this patient with related data
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        *,
        patient:users!lab_bookings_patient_id_fkey(id, name, phone, email),
        center:centers(id, name, address, phone, email),
        lab_test_type:lab_test_types(id, name, description, category, default_fee)
      `)
      .eq('patient_id', patientId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching lab bookings:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch lab bookings',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [My Lab Bookings] Found', bookings?.length || 0, 'bookings');

    // Enrich bookings with proper field names for frontend
    const enrichedBookings = (bookings || []).map(booking => ({
      ...booking,
      type: booking.lab_test_type,
      center_name: booking.center?.name,
      center_address: booking.center?.address
    }));

    return NextResponse.json({
      success: true,
      bookings: enrichedBookings
    });

  } catch (error: any) {
    console.error('❌ My lab bookings API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

