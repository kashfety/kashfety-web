import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  if (authHeader) {
    try {
      const url = new URL(`${BACKEND_URL}/api/doctor-dashboard/appointments`);
      searchParams.forEach((v, k) => url.searchParams.set(k, v));
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
    } catch (e) {
      // continue fallback
    }
  }

  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  try {
    const doctorId = searchParams.get('doctor_id');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Join patient user data to get name/phone/email
    const { data, error } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        appointment_type,
        type,
        consultation_fee,
        symptoms,
        chief_complaint,
        notes,
        patient_id,
        users:users!appointments_patient_id_fkey (name, phone, email)
      `)
      .eq('doctor_id', doctorId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const toHHMM = (t: any) => {
      if (!t) return t;
      const s = String(t);
      return s.length >= 5 ? s.slice(0, 5) : s;
    };

    const appointments = (data || []).map((row: any) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.id,
        appointment_date: row.appointment_date,
        appointment_time: toHHMM(row.appointment_time), // normalize for UI
        status: row.status, // keep exact DB status for cross-view consistency
        appointment_type: row.appointment_type || row.type || 'Clinic',
        type: row.type,
        consultation_fee: row.consultation_fee,
        symptoms: row.symptoms,
        chief_complaint: row.chief_complaint,
        notes: row.notes,
        patient_id: row.patient_id,
        patient_name: user?.name || 'Patient',
        patient_phone: user?.phone || null,
        patient_email: user?.email || null,
      };
    });

    return NextResponse.json({ success: true, appointments });
  } catch (e: any) {
    console.error('appointments fallback error:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch appointments' }, { status: 500 });
  }
}
