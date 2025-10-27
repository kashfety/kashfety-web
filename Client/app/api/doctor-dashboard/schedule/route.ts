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
      const qs = searchParams.toString();
      const url = qs
        ? `${BACKEND_URL}/api/doctor-dashboard/schedule?${qs}`
        : `${BACKEND_URL}/api/doctor-dashboard/schedule`;
      const response = await fetch(url, {
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
    let doctorId = searchParams.get('doctor_id') || '';
    if (!doctorId) {
      const authHeader2 = request.headers.get('authorization');
      if (authHeader2) {
        try {
          const token = authHeader2.replace(/^Bearer\s+/i, '');
          const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
          doctorId = (payload.id || payload.user_id || payload.sub || '').toString();
        } catch {}
      }
    }
    const centerId = searchParams.get('center_id');
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Verify assignment
    const { data: assignment, error: aErr } = await supabase
      .from('doctor_centers')
      .select('center_id')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();
    if (aErr || !assignment) return NextResponse.json({ error: 'You are not assigned to this center' }, { status: 403 });
    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('day_of_week, is_available, time_slots, consultation_fee, center_id')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .order('day_of_week', { ascending: true });
    if (error) throw error;
    return NextResponse.json({ success: true, schedule: data || [], home_visits_available: false, default_consultation_fee: null });
  } catch (e: any) {
    console.error('schedule GET fallback error:', e);
    return NextResponse.json({ error: e.message || 'Failed to load schedule' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const body = await request.json();
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/schedule`, {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
    } catch (e) {
      // continue fallback
    }
  }

  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  try {
    let doctorId = searchParams.get('doctor_id') || '';
    if (!doctorId) {
      const authHeader2 = request.headers.get('authorization');
      if (authHeader2) {
        try {
          const token = authHeader2.replace(/^Bearer\s+/i, '');
          const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
          doctorId = (payload.id || payload.user_id || payload.sub || '').toString();
        } catch {}
      }
    }
    const centerId = searchParams.get('center_id') || body?.center_id;
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    if (!Array.isArray(body?.schedule || body)) return NextResponse.json({ error: 'schedule array required' }, { status: 400 });
    const scheduleArray = Array.isArray(body) ? body : body.schedule;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    // Verify assignment
    const { data: assignment, error: aErr } = await supabase
      .from('doctor_centers')
      .select('center_id')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();
    if (aErr || !assignment) return NextResponse.json({ error: 'You are not assigned to this center' }, { status: 403 });
    // Replace per center
    const { error: delErr } = await supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId);
    if (delErr) throw delErr;
    const rows = scheduleArray.map((r: any) => ({
      doctor_id: doctorId,
      center_id: centerId,
      day_of_week: r.day_of_week,
      is_available: r.is_available !== false,
      time_slots: r.time_slots || [],
      consultation_fee: r.consultation_fee ?? null,
      break_start: r.break_start ?? null,
      break_end: r.break_end ?? null,
      notes: r.notes ?? null,
    }));
    const { error: insErr } = await supabase.from('doctor_schedules').insert(rows);
    if (insErr) throw insErr;
    return NextResponse.json({ success: true, center_id: centerId });
  } catch (e: any) {
    console.error('schedule PUT fallback error:', e);
    return NextResponse.json({ error: e.message || 'Failed to save schedule' }, { status: 500 });
  }
}
