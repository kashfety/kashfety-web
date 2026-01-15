import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  // SECURITY: Verify JWT token and require doctor role
  const authResult = requireDoctor(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403
  }
  const { user } = authResult;

  // SECURITY: Use authenticated doctor's ID, not query parameter
  const doctorId = user.id;
  const authHeader = request.headers.get('authorization');
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');

  // Try backend with JWT first (preferred - has proper auth validation)
  try {
    const url = new URL(`${BACKEND_URL}/api/doctor-dashboard/patients`);
    searchParams.forEach((v, k) => url.searchParams.set(k, v));
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: authHeader || '', 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    if (response.ok) return NextResponse.json(data);
    // If backend returns auth error, propagate it
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({ error: data.error || 'Unauthorized' }, { status: response.status });
    }
  } catch (e) {
    // Backend unavailable, continue to fallback with auth requirement
    console.error('Backend unavailable, using secure fallback:', e);
  }

  // Secure fallback: Only fetch patients who have appointments with THIS doctor
  try {
    // Get patients who have appointments with this specific doctor
    const { data: patientAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        appointment_date,
        status,
        users!appointments_patient_id_fkey (
          id,
          name,
          name_ar,
          first_name,
          first_name_ar,
          last_name,
          last_name_ar,
          email,
          phone,
          gender,
          date_of_birth,
          medical_history,
          allergies,
          medications,
          emergency_contact,
          created_at,
          updated_at
        )
      `)
      .eq('doctor_id', doctorId)  // SECURITY FIX: Filter by doctor_id
      .order('appointment_date', { ascending: false });

    if (appointmentsError) {
      console.error('Failed to fetch patient appointments:', appointmentsError);
      return NextResponse.json(
        { error: 'Failed to fetch patients' },
        { status: 500 }
      );
    }

    // Process successful response with joins
    const patientMap = new Map();

    patientAppointments?.forEach(apt => {
      const patients = apt.users;
      const patient = Array.isArray(patients) ? patients[0] : patients;

      if (patient && !patientMap.has(patient.id)) {
        const age = patient.date_of_birth ?
          new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;

        patientMap.set(patient.id, {
          ...patient,
          age,
          lastAppointment: apt.appointment_date,
          totalAppointments: 1
        });
      } else if (patient && patientMap.has(patient.id)) {
        const existing = patientMap.get(patient.id);
        existing.totalAppointments += 1;
        if (apt.appointment_date > existing.lastAppointment) {
          existing.lastAppointment = apt.appointment_date;
        }
      }
    });

    const patients = Array.from(patientMap.values()).slice(0, limit);

    return NextResponse.json({
      success: true,
      patients,
      count: patients.length
    });

  } catch (error) {
    console.error('Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
