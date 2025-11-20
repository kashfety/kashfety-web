import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') || '50');

  // Prefer backend with JWT
  if (authHeader) {
    try {
      const url = new URL(`${BACKEND_URL}/api/doctor-dashboard/patients`);
      searchParams.forEach((v, k) => url.searchParams.set(k, v));
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
    } catch (e) {
      // continue to fallback
    }
  }

  if (!FALLBACK_ENABLED) {
    return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  }

  try {
    console.log('👥 Fallback: Fetching patients list with medical information');

    // Get patients who have appointments, with all their medical information
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
      .order('appointment_date', { ascending: false });

    if (appointmentsError) {
      console.error('❌ Patient appointments error:', appointmentsError);

      // Fallback approach: Get all patients with role='patient'
      const { data: patients, error: patientsError } = await supabase
        .from('users')
        .select(`
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
        `)
        .eq('role', 'patient')
        .limit(limit);

      if (patientsError) {
        console.error('❌ Fallback patients fetch error:', patientsError);
        return NextResponse.json(
          { error: 'Failed to fetch patients' },
          { status: 500 }
        );
      }

      const patientsWithAge = patients?.map(patient => {
        const age = patient.date_of_birth ?
          new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;

        return {
          ...patient,
          age,
          totalAppointments: 0,
          lastAppointment: null
        };
      }) || [];

      console.log('✅ Fetched patients via fallback:', patientsWithAge.length);

      return NextResponse.json({
        success: true,
        patients: patientsWithAge,
        count: patientsWithAge.length
      });
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

    console.log('✅ Fetched patients with medical info:', patients.length);

    return NextResponse.json({
      success: true,
      patients,
      count: patients.length
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
