import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> | { patientId: string } }
) {
  // Require center authentication even in fallback mode
  const authResult = requireCenter(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403 error
  }
  const { user } = authResult;

  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Handle both Promise and direct params for NextJS compatibility
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const { patientId } = resolvedParams;

  if (!patientId) {
    return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
  }

  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/patients/${patientId}`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      // fall back to supabase
    }
  }

  // Supabase fallback: requires authentication (already verified above)
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  
  try {
    const centerId = searchParams.get('center_id') || user.center_id;
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify center has access to this patient (patient must have bookings at this center)
    const { data: booking, error: bookingError } = await supabase
      .from('lab_bookings')
      .select('id')
      .eq('patient_id', patientId)
      .eq('center_id', centerId)
      .limit(1)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - You can only access patients who have bookings at your center'
      }, { status: 403 });
    }

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, date_of_birth, medical_history, allergies, medications, created_at')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (patientError || !patient) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Optionally include recent lab bookings at this center
    const { data: recent } = await supabase
      .from('lab_bookings')
      .select('id, booking_date, booking_time, status, lab_test_type:lab_test_types(id, name, category)')
      .eq('patient_id', patientId)
      .eq('center_id', centerId)
      .order('booking_date', { ascending: false })
      .limit(10);

    return NextResponse.json({
      success: true,
      patient,
      recent: recent || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch patient details' }, { status: 500 });
  }
}
