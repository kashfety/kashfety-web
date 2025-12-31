import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Require doctor authentication
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

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

    // Get patient's profile medical information (from users table)
    const { data: patientProfile, error: patientError } = await supabase
      .from('users')
      .select(`
        id,
        medical_history,
        allergies,
        medications,
        emergency_contact,
        date_of_birth,
        gender
      `)
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    // Patient profile fetch error is non-critical, continue without it

    // Get medical records (consultation records) for this patient
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

    // Combine consultation records with patient profile medical info
    // The frontend expects { records: [...] } format
    const allRecords = [...(records || [])];
    
    // If patient has profile medical info but no consultation records, 
    // we can include it as a summary record (optional - frontend can also get this from patient details)
    // For now, just return the consultation records as the frontend expects
    
    return NextResponse.json({
      success: true,
      records: allRecords,
      count: allRecords.length,
      // Also include patient profile for reference (frontend can use this if needed)
      patient_profile: patientProfile ? {
        medical_history: patientProfile.medical_history,
        allergies: patientProfile.allergies,
        medications: patientProfile.medications,
        emergency_contact: patientProfile.emergency_contact,
        date_of_birth: patientProfile.date_of_birth,
        gender: patientProfile.gender
      } : null
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

