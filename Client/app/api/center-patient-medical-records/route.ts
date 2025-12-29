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
          error: 'Forbidden - You can only access medical records for patients who have bookings at your center'
        }, { status: 403 });
      }
    }

    // Fetch medical records for the patient (simpler query without foreign key join)
    const { data: medicalRecords, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch medical records', details: error.message }, { status: 500 });
    }

    // Manually enrich with doctor information
    const enrichedRecords = [];
    for (const record of medicalRecords || []) {
      let doctorInfo = null;
      if (record.doctor_id) {
        const { data: doctor } = await supabase
          .from('users')
          .select('id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, specialty, profile_picture')
          .eq('id', record.doctor_id)
          .single();
        doctorInfo = doctor;
      }
      
      enrichedRecords.push({
        ...record,
        doctor: doctorInfo
      });
    }

    return NextResponse.json({ success: true, records: enrichedRecords });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

