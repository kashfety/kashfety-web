import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      console.log('🔄 Attempting backend request to:', `${BACKEND_URL}/api/center-dashboard/lab-tests/today`);
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/lab-tests/today`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      console.log('📊 Backend response status:', response.status, response.statusText);
      const responseText = await response.text();
      console.log('📊 Backend response preview:', responseText.slice(0, 200));
      
      if (response.ok) {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
      }
      // fall through on non-OK
    } catch (e) {
      console.error('Backend request failed:', e);
      // fall back to supabase
    }
  }

  // Supabase fallback: requires center_id query param
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  
  try {
    const centerId = searchParams.get('center_id');
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get ALL upcoming bookings for this center (no date filter)
    console.log('Fetching ALL bookings for center:', centerId);

    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        *,
        lab_test_types (
          name,
          category
        ),
        patients:patient_id (
          name,
          email,
          phone
        )
      `)
      .eq('center_id', centerId)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    console.log('Supabase query result:', { error, bookingsCount: bookings?.length, centerId });

    if (error) {
      console.error('Failed to fetch upcoming bookings:', error);
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Transform the data to match dashboard expectations
    const transformedBookings = (bookings || []).map((booking: any) => ({
      ...booking,
      // Map field names to match dashboard expectations
      patient_name: booking.patients?.name || 'Unknown Patient',
      test_type_name: booking.lab_test_types?.name || 'Unknown Test',
      appointment_date: booking.booking_date,
      appointment_time: booking.booking_time
    }));

    console.log('Transformed bookings:', transformedBookings.length, 'bookings');

    return NextResponse.json({ 
      success: true,
      appointments: transformedBookings,
      bookings: transformedBookings // Keep both for compatibility
    });

  } catch (error: any) {
    console.error('Center lab tests fallback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch lab tests' }, { status: 500 });
  }
}
