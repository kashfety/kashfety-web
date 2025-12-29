import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    // Require center authentication
    const authResult = requireCenter(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify center has access to this patient (patient must have bookings at this center)
    const centerId = user.center_id;
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
          error: 'Forbidden - You can only access medical information for patients who have bookings at your center'
        }, { status: 403 });
      }
    }

    // Get patient's registration and medical information (not consultation history)
    const { data: medicalRecords, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        gender,
        date_of_birth,
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
      console.error('Failed to fetch medical records:', error);
      return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      medicalRecords: medicalRecords ? [medicalRecords] : []
    });

  } catch (error) {
    console.error('Medical records API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
