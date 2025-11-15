import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  console.log('📅 [Schedule GET] Request received');
  console.log('📅 [Schedule GET] Query params:', searchParams.toString());
  
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
      if (response.ok) {
        console.log('📅 [Schedule GET] Backend proxy success');
        return NextResponse.json(data);
      }
    } catch (e) {
      console.log('📅 [Schedule GET] Backend proxy failed, using fallback');
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
    
    console.log('📅 [Schedule GET] Doctor ID:', doctorId);
    console.log('📅 [Schedule GET] Center ID:', centerId);
    
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify assignment
    console.log('📅 [Schedule GET] Verifying doctor-center assignment...');
    const { data: assignment, error: aErr } = await supabase
      .from('doctor_centers')
      .select('center_id')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();
    
    if (aErr || !assignment) {
      console.error('📅 [Schedule GET] Assignment verification failed:', aErr);
      return NextResponse.json({ error: 'You are not assigned to this center' }, { status: 403 });
    }
    console.log('📅 [Schedule GET] Assignment verified ✅');
    
    console.log('📅 [Schedule GET] Fetching schedules...');
    const { data, error } = await supabase
      .from('doctor_schedules')
      .select('day_of_week, is_available, time_slots, consultation_fee, center_id, break_start, break_end, notes')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .order('day_of_week', { ascending: true });
    
    if (error) {
      console.error('📅 [Schedule GET] Fetch error:', error);
      throw error;
    }
    
    console.log('📅 [Schedule GET] Found', data?.length || 0, 'schedule entries');
    console.log('📅 [Schedule GET] Schedule data:', JSON.stringify(data, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      schedule: data || [], 
      home_visits_available: false, 
      default_consultation_fee: null 
    });
  } catch (e: any) {
    console.error('📅 [Schedule GET] Fallback error:', e);
    return NextResponse.json({ error: e.message || 'Failed to load schedule' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const body = await request.json();
  
  console.log('📅 [Schedule PUT] Request received');
  console.log('📅 [Schedule PUT] Body:', JSON.stringify(body, null, 2));
  
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
      console.log('📅 [Schedule PUT] Backend proxy failed, using fallback');
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
    
    console.log('📅 [Schedule PUT] Doctor ID:', doctorId);
    console.log('📅 [Schedule PUT] Center ID:', centerId);
    
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    if (!Array.isArray(body?.schedule || body)) return NextResponse.json({ error: 'schedule array required' }, { status: 400 });
    
    const scheduleArray = Array.isArray(body) ? body : body.schedule;
    console.log('📅 [Schedule PUT] Schedule array length:', scheduleArray.length);
    console.log('📅 [Schedule PUT] Schedule data:', JSON.stringify(scheduleArray, null, 2));
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Verify assignment
    console.log('📅 [Schedule PUT] Verifying doctor-center assignment...');
    const { data: assignment, error: aErr } = await supabase
      .from('doctor_centers')
      .select('center_id')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();
    
    if (aErr || !assignment) {
      console.error('📅 [Schedule PUT] Assignment verification failed:', aErr);
      return NextResponse.json({ error: 'You are not assigned to this center' }, { status: 403 });
    }
    console.log('📅 [Schedule PUT] Assignment verified ✅');
    
    // Delete existing schedules for this doctor and center
    console.log('📅 [Schedule PUT] Deleting existing schedules for doctor:', doctorId, 'center:', centerId);
    const { error: delErr } = await supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId);
    
    if (delErr) {
      console.error('📅 [Schedule PUT] Delete error:', delErr);
      throw delErr;
    }
    console.log('📅 [Schedule PUT] Existing schedules deleted ✅');
    
    // Build rows to insert
    const rows = scheduleArray.map((r: any) => {
      const row = {
        doctor_id: doctorId,
        center_id: centerId,
        day_of_week: r.day_of_week,
        is_available: r.is_available !== false,
        time_slots: r.time_slots || [],
        consultation_fee: r.consultation_fee ?? null,
        break_start: r.break_start ?? null,
        break_end: r.break_end ?? null,
        notes: r.notes ?? null,
      };
      console.log('📅 [Schedule PUT] Row to insert:', JSON.stringify(row, null, 2));
      return row;
    });
    
    console.log('📅 [Schedule PUT] Inserting', rows.length, 'schedule rows...');
    const { data: insertedData, error: insErr } = await supabase
      .from('doctor_schedules')
      .insert(rows)
      .select();
    
    if (insErr) {
      console.error('📅 [Schedule PUT] Insert error:', insErr);
      console.error('📅 [Schedule PUT] Insert error details:', JSON.stringify(insErr, null, 2));
      throw insErr;
    }
    
    console.log('📅 [Schedule PUT] Insert successful ✅');
    console.log('📅 [Schedule PUT] Inserted data:', JSON.stringify(insertedData, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      center_id: centerId,
      schedule: insertedData 
    });
  } catch (e: any) {
    console.error('📅 [Schedule PUT] Fallback error:', e);
    console.error('📅 [Schedule PUT] Error stack:', e.stack);
    return NextResponse.json({ error: e.message || 'Failed to save schedule' }, { status: 500 });
  }
}
