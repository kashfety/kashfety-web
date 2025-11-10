import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 [Center Patient Details] Request received');
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const centerId = searchParams.get('center_id');

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      console.error('❌ Failed to fetch patient details:', error);
      return NextResponse.json({ success: false, error: 'Patient not found', details: error.message }, { status: 404 });
    }

    // Optionally verify the patient has bookings at this center
    if (centerId) {
      const { data: bookings, error: bookingsError } = await supabase
        .from('lab_bookings')
        .select('id')
        .eq('patient_id', patientId)
        .eq('center_id', centerId)
        .limit(1);

      if (bookingsError) {
        console.warn('⚠️ Could not verify patient booking at center:', bookingsError);
      } else if (!bookings || bookings.length === 0) {
        console.warn('⚠️ Patient has no bookings at this center');
      }
    }

    console.log('✅ [Center Patient Details] Fetched patient:', patient.id);
    return NextResponse.json({ success: true, patient });

  } catch (error: any) {
    console.error('❌ Center patient details API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

