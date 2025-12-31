import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Check if authorization header is present
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ No Authorization header found in request');
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    // Require doctor authentication
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      console.error('❌ Authentication failed - status:', authResult.status);
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;
    
    console.log('✅ Doctor authenticated:', user.id, user.role);

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');


    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify doctor has appointments with this patient
    const { data: appointments, error: appointmentCheckError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', user.id)
      .eq('patient_id', patientId)
      .limit(1);

    if (appointmentCheckError || !appointments || appointments.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - You can only access medical records for patients who booked with you'
      }, { status: 403 });
    }

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
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch medical records',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      medical_records: records || []
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

