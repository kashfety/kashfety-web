import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/today-stats`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      // fall back to supabase
    }
  }

  // Supabase fallback: requires doctor_id query param
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  try {
    const doctorId = searchParams.get('doctor_id');
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const today = new Date();
    const todayStr = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().slice(0,10);

    const { data: apptsToday, error } = await supabase
      .from('appointments')
      .select('status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', todayStr);
    if (error) throw error;

    const counts = { scheduled: 0, completed: 0, cancelled: 0 } as Record<string, number>;
    for (const a of apptsToday || []) {
      const s = (a as any).status || 'scheduled';
      if (s === 'completed') counts.completed++;
      else if (s === 'cancelled') counts.cancelled++;
      else counts.scheduled++;
    }
    const total = (apptsToday || []).length;

    // Upcoming next 7 days (scheduled or confirmed)
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    const nextWeekStr = new Date(Date.UTC(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate())).toISOString().slice(0,10);

    const { data: upcoming } = await supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status, patient_id, users:users!appointments_patient_id_fkey (name, phone, email)')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', todayStr)
      .lte('appointment_date', nextWeekStr)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    const toHHMM = (t: any) => {
      if (!t) return t; const s = String(t); return s.length >= 5 ? s.slice(0,5) : s;
    };

    const upcomingList = (upcoming || []).map((row: any) => {
      const user = Array.isArray(row.users) ? row.users[0] : row.users;
      return {
        id: row.id,
        appointment_date: row.appointment_date,
        appointment_time: toHHMM(row.appointment_time),
        status: row.status,
        patient_name: user?.name || 'Patient',
        patient_phone: user?.phone || null,
      };
    });

    // Normalize to client-expected shape
    return NextResponse.json({
      stats: {
        todayAppointments: total,
        todayCompleted: counts.completed,
        todayRevenue: 0,
      },
      appointments: upcomingList,
    });
  } catch (e: any) {
    console.error('today-stats fallback error:', e);
    return NextResponse.json({ error: e.message || 'Failed to compute stats' }, { status: 500 });
  }
}
