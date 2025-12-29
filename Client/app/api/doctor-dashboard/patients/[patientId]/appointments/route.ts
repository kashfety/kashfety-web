import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    const { patientId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const doctorId = searchParams.get('doctorId');

    if (authHeader) {
      try {
        const url = new URL(`${BACKEND_URL}/api/doctor-dashboard/patients/${patientId}/appointments`);
        if (doctorId) url.searchParams.set('doctorId', doctorId);
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

    let query = supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId);
    if (doctorId) query = query.eq('doctor_id', doctorId);
    const { data: appointments, error: appointmentsError } = await query.order('appointment_date', { ascending: false });
    if (appointmentsError) {
      return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 });
    }

    const enrichedAppointments = await Promise.all(
      (appointments || []).map(async (appointment) => {
        if (appointment.doctor_id) {
          const { data: doctor } = await supabase
            .from('users')
            .select('id, name, phone, email')
            .eq('id', appointment.doctor_id)
            .eq('role', 'doctor')
            .single();
          return { ...appointment, doctor };
        }
        return appointment;
      })
    );

    return NextResponse.json({ success: true, appointments: enrichedAppointments || [], count: enrichedAppointments?.length || 0 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
