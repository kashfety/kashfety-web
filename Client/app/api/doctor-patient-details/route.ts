import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    console.log('👤 [Doctor - Patient Details] Fetching for patient:', patientId);

    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get patient details
    const { data: patient, error } = await supabase
      .from('users')
      .select('id, name, email, phone, gender, date_of_birth, created_at, profile_picture')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (error) {
      console.error('❌ Error fetching patient:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Patient not found',
        details: error.message 
      }, { status: 404 });
    }

    console.log('✅ [Doctor - Patient Details] Found patient:', patient.name);
    return NextResponse.json({
      success: true,
      patient
    });

  } catch (error: any) {
    console.error('❌ Doctor patient details error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

