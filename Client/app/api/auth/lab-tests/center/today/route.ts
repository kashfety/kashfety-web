import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  // Require center authentication even in fallback mode
  const authResult = requireCenter(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403 error
  }
  const { user } = authResult;

  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);

  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/lab-tests/today`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const responseText = await response.text();

      if (response.ok) {
        const data = JSON.parse(responseText);
        return NextResponse.json(data);
      }
      // fall through on non-OK
    } catch (e) {
      // fall back to supabase
    }
  }

  // Supabase fallback: requires authentication (already verified above)
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });

  try {
    const centerId = user.center_id || searchParams.get('center_id');
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get ALL upcoming bookings for this center (no date filter)

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
          name_ar,
          first_name,
          first_name_ar,
          last_name,
          last_name_ar,
          email,
          phone
        )
      `)
      .eq('center_id', centerId)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });


    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Transform the data to match dashboard expectations
    const transformedBookings = (bookings || []).map((booking: any) => ({
      ...booking,
      // Map field names to match dashboard expectations
      patient_name: booking.patients?.name || 'Unknown Patient',
      name: booking.patients?.name,
      name_ar: booking.patients?.name_ar,
      first_name: booking.patients?.first_name,
      first_name_ar: booking.patients?.first_name_ar,
      last_name: booking.patients?.last_name,
      last_name_ar: booking.patients?.last_name_ar,
      patient_phone: booking.patients?.phone || '',
      patient_email: booking.patients?.email || '',
      test_type_name: booking.lab_test_types?.name || 'Unknown Test',
      appointment_date: booking.booking_date,
      appointment_time: booking.booking_time,
      appointment_type: booking.lab_test_types?.category || 'lab',
      type: 'lab',
      consultation_fee: booking.total_amount || booking.amount || booking.fee || 0
    }));


    return NextResponse.json({
      success: true,
      appointments: transformedBookings,
      bookings: transformedBookings // Keep both for compatibility
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch lab tests' }, { status: 500 });
  }
}
