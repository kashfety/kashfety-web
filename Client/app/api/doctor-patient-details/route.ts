import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify JWT token and require doctor role
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    const { user } = authResult;
    const doctorId = user.id;
    
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');

    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // SECURITY: Verify this patient has an appointment with the authenticated doctor
    const { data: hasAppointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id')
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId)
      .limit(1);

    if (appointmentError || !hasAppointment || hasAppointment.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Access denied - Patient not found in your appointments' 
      }, { status: 403 });
    }

    // Get patient details including medical information
    const { data: patient, error } = await supabase
      .from('users')
      .select('id, name, name_ar, first_name, first_name_ar, last_name, last_name_ar, email, phone, gender, date_of_birth, created_at, profile_picture, medical_history, allergies, medications, emergency_contact')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient not found',
        details: error.message 
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      patient
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

