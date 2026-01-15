import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { markPastAppointmentsAsAbsent } from '@/lib/appointmentHelpers';
import { requireDoctor } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  // SECURITY: Verify JWT token and require doctor role
  const authResult = requireDoctor(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403
  }
  const { user } = authResult;
  
  // SECURITY: Use authenticated doctor's ID
  const doctorId = user.id;
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  if (authHeader) {
    try {
      const url = new URL(`${BACKEND_URL}/api/doctor-dashboard/appointments`);
      url.searchParams.set('doctor_id', doctorId); // Use verified doctor ID
      searchParams.forEach((v, k) => { if (k !== 'doctor_id') url.searchParams.set(k, v); });
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

  // Fallback to direct Supabase query
  try {
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    // Mark past appointments as absent before fetching
    await markPastAppointmentsAsAbsent(doctorId, null);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Join patient user data and center data to get name/phone/email and clinic info
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
        center_id,
        users:users!appointments_patient_id_fkey (
          name, 
          name_ar,
          first_name,
          first_name_ar,
          last_name,
          last_name_ar,
          phone, 
          email
        ),
        center:centers!fk_appointments_center (
          id,
          name,
          name_ar,
          address,
          phone
        )
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
      const center = Array.isArray(row.center) ? row.center[0] : row.center;
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
        center_id: row.center_id,
        patient_name: user?.name || 'Patient',
        name: user?.name,
        name_ar: user?.name_ar,
        first_name: user?.first_name,
        first_name_ar: user?.first_name_ar,
        last_name: user?.last_name,
        last_name_ar: user?.last_name_ar,
        patient_phone: user?.phone || null,
        patient_email: user?.email || null,
        center: center || null,
        center_name: center?.name || null,
        center_name_ar: center?.name_ar || null,
        center_address: center?.address || null,
      };
    });

    return NextResponse.json({ success: true, appointments });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch appointments' }, { status: 500 });
  }
}
