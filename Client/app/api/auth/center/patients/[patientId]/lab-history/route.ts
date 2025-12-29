import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> | { patientId: string } }
) {
  try {
    // Require center authentication
    const authResult = requireCenter(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

    // Handle both Promise and direct params for NextJS compatibility
    const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
    const { patientId } = resolvedParams;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('center_id') || user.center_id;

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

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
        error: 'Forbidden - You can only access lab history for patients who have bookings at your center'
      }, { status: 403 });
    }

    // Get patient's lab booking history for this center
    const { data: labHistory, error } = await supabase
      .from('lab_bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        notes,
        fee,
        result_file_url,
        result_notes,
        result_date,
        created_at,
        updated_at,
        center:centers!center_id(id, name, name_ar, address, phone),
        test_type:lab_test_types!lab_test_type_id(id, name, name_ar, category, description)
      `)
      .eq('patient_id', patientId)
      .eq('center_id', centerId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch lab history', details: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      bookings: labHistory || []
    });

  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
