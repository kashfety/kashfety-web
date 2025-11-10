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

    // Fetch medical records for the patient (simpler query without foreign key join)
    const { data: medicalRecords, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch medical records:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch medical records', details: error.message }, { status: 500 });
    }

    // Manually enrich with doctor information
    const enrichedRecords = [];
    for (const record of medicalRecords || []) {
      let doctorInfo = null;
      if (record.doctor_id) {
        const { data: doctor } = await supabase
          .from('users')
          .select('id, name, specialty, profile_picture')
          .eq('id', record.doctor_id)
          .single();
        doctorInfo = doctor;
      }
      
      enrichedRecords.push({
        ...record,
        doctor: doctorInfo
      });
    }

    console.log('✅ [Center Patient Medical Records] Fetched', enrichedRecords.length, 'records for patient:', patientId);
    return NextResponse.json({ success: true, records: enrichedRecords });

  } catch (error: any) {
    console.error('❌ Center patient medical records API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

