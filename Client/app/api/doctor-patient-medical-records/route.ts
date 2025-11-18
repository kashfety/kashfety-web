import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    console.log('📋 [Doctor - Patient Medical Records] Fetching for patient:', patientId);

    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get medical records for this patient
    const { data: records, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        doctor:users!medical_records_doctor_id_fkey(id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, specialty)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching medical records:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch medical records',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Doctor - Patient Medical Records] Found', records?.length || 0, 'records');
    return NextResponse.json({
      success: true,
      medical_records: records || []
    });

  } catch (error: any) {
    console.error('❌ Doctor patient medical records error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

