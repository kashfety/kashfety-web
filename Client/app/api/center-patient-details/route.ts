import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    
    // Require center authentication
    const authResult = requireCenter(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const centerId = searchParams.get('center_id') || user.center_id;

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify center has access to this patient (patient must have bookings at this center)
    if (centerId) {
      const { data: booking, error: bookingError } = await supabase
        .from('lab_bookings')
        .select('id')
        .eq('patient_id', patientId)
        .eq('center_id', centerId)
        .limit(1)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only access details for patients who have bookings at your center'
        }, { status: 403 });
      }
    }

    // Fetch patient details
    const { data: patient, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        first_name,
        last_name,
        email,
        phone,
        gender,
        date_of_birth,
        profile_picture,
        medical_history,
        allergies,
        medications,
        emergency_contact,
        created_at,
        updated_at
      `)
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: 'Patient not found', details: error.message }, { status: 404 });
    }


    return NextResponse.json({ success: true, patient });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

