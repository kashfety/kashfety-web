import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🩺 [Center Patient Medical Records] Request received');
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const centerId = searchParams.get('center_id');

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch medical records for the patient
    const { data: medicalRecords, error } = await supabase
      .from('medical_records')
      .select(`
        id,
        patient_id,
        doctor_id,
        appointment_id,
        record_date,
        diagnosis,
        treatment,
        prescription,
        notes,
        created_at,
        updated_at,
        doctor:users!fk_medical_records_doctor_id(id, name, specialty, profile_picture)
      `)
      .eq('patient_id', patientId)
      .order('record_date', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch medical records:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch medical records', details: error.message }, { status: 500 });
    }

    console.log('✅ [Center Patient Medical Records] Fetched', medicalRecords.length, 'records for patient:', patientId);
    return NextResponse.json({ success: true, records: medicalRecords || [] });

  } catch (error: any) {
    console.error('❌ Center patient medical records API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

