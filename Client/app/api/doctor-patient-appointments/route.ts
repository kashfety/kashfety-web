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
    
    // SECURITY: Use authenticated doctor's ID
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

    // Build query - SECURITY: Always filter by authenticated doctor's ID
    const query = supabase
      .from('appointments')
      .select(`
        *,
        doctor:users!fk_appointments_doctor(id, name, specialty, phone),
        center:centers!fk_appointments_center(id, name, address, phone)
      `)
      .eq('patient_id', patientId)
      .eq('doctor_id', doctorId);

    const { data: appointments, error } = await query
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch appointments',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      appointments: appointments || []
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

