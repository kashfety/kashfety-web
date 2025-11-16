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
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          doctorId = (payload.id || payload.userId || payload.user_id || payload.sub || '').toString();
        } catch {}
      }
    }
    const centerId = searchParams.get('center_id');
    
    console.log('📅 [Schedule GET] Doctor ID:', doctorId);
    console.log('📅 [Schedule GET] Center ID:', centerId);
    
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Build query
    let query = supabase
      .from('doctor_schedules')
      .select('*, centers:center_id(id, name, address)')
      .eq('doctor_id', doctorId);
    
    // Filter by center if specified
    if (centerId) {
      console.log('📅 [Schedule GET] Filtering by center:', centerId);
      query = query.eq('center_id', centerId);
      
      // Verify assignment for specific center
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
    }
    
    query = query.order('center_id').order('day_of_week', { ascending: true });
    
    console.log('📅 [Schedule GET] Fetching schedules...');
    const { data: schedule, error } = await query;
    
    if (error) {
      console.error('📅 [Schedule GET] Fetch error:', error);
      throw error;
    }
    
    console.log('📅 [Schedule GET] Found', schedule?.length || 0, 'schedule entries');
    console.log('📅 [Schedule GET] Schedule data:', JSON.stringify(schedule, null, 2));
    
    // Get doctor's home visit availability and consultation fee
    const { data: doctor, error: doctorError } = await supabase
      .from('users')
      .select('home_visits_available, consultation_fee')
      .eq('id', doctorId)
      .single();
    
    if (doctorError) {
      console.error('📅 [Schedule GET] Doctor fetch error:', doctorError);
    }
    
    // Group schedule by center if no specific center requested
    let groupedSchedule: any = {};
    if (!centerId) {
      schedule?.forEach((item: any) => {
        const cid = item.center_id || 'general';
        const centerName = item.centers?.name || 'General Schedule';
        
        if (!groupedSchedule[cid]) {
          groupedSchedule[cid] = {
            center_id: cid,
            center_name: centerName,
            center_info: item.centers,
            schedule: []
          };
        }
        groupedSchedule[cid].schedule.push(item);
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      schedule: centerId ? (schedule || []) : Object.values(groupedSchedule),
      home_visits_available: doctor?.home_visits_available || false, 
      default_consultation_fee: doctor?.consultation_fee || null,
      center_specific: !centerId
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
          const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          doctorId = (payload.id || payload.userId || payload.user_id || payload.sub || '').toString();
        } catch {}
      }
    }
    const centerId = searchParams.get('center_id') || body?.center_id;
    
    console.log('📅 [Schedule PUT] Doctor ID:', doctorId);
    console.log('📅 [Schedule PUT] Center ID:', centerId);
    
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    if (!centerId) return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'You are not assigned to this medical center. Please go to Centers tab to select your assigned centers first.' }, { status: 403 });
    }
    console.log('📅 [Schedule PUT] Assignment verified ✅');
    
    // Validate schedule format
    if (scheduleArray.length === 0) {
      console.log('⚠️ Empty schedule received, clearing doctor schedule for this center');
    }
    
    // Try to use the database function first (if it exists)
    console.log('📡 Attempting to call setup_doctor_weekly_schedule function...');
    const { error: funcError } = await supabase
      .rpc('setup_doctor_weekly_schedule', {
        p_doctor_id: doctorId,
        p_schedule: scheduleArray,
        p_center_id: centerId
      });
    
    // If RPC function doesn't exist or fails, use manual insert approach
    if (funcError) {
      console.log('⚠️ RPC function not available, using manual insert approach');
      console.log('RPC Error:', funcError);
      
      // Delete existing schedules for this doctor and center
      const { error: delErr } = await supabase
        .from('doctor_schedules')
        .delete()
        .eq('doctor_id', doctorId)
        .eq('center_id', centerId);
      
      if (delErr) {
        console.error('❌ Delete error:', delErr);
        throw delErr;
      }
      console.log('✅ Existing schedules deleted for center:', centerId);
      
      // Build rows to insert - ensure all required fields are present
      const rows = scheduleArray.map((item: any) => ({
        doctor_id: doctorId,
        center_id: centerId,
        day_of_week: item.day_of_week,
        is_available: item.is_available !== false,
        time_slots: item.time_slots || [],
        consultation_fee: item.consultation_fee ?? null,
        break_start: item.break_start ?? null,
        break_end: item.break_end ?? null,
        notes: item.notes ?? null,
      }));
      
      console.log('📅 Inserting', rows.length, 'schedule rows manually...');
      console.log('Rows to insert:', JSON.stringify(rows, null, 2));
      
      // Insert new schedules
      const { error: insErr } = await supabase
        .from('doctor_schedules')
        .insert(rows);
      
      if (insErr) {
        console.error('❌ Insert error:', insErr);
        throw insErr;
      }
      console.log('✅ Manual insert successful');
    } else {
      console.log('✅ RPC function completed successfully');
    }
    
    console.log('✅ Schedule updated successfully for center:', centerId);
    
    // Get the updated schedule for this specific center
    const { data: updatedSchedule, error: fetchError } = await supabase
      .from('doctor_schedules')
      .select('*, centers:center_id(id, name, address)')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .order('day_of_week');
    
    if (fetchError) {
      console.error('❌ Error fetching updated schedule:', fetchError);
      throw fetchError;
    }
    
    console.log('📅 Updated schedule retrieved:', updatedSchedule?.length, 'records');
    
    return NextResponse.json({ 
      success: true,
      message: 'Schedule updated successfully',
      schedule: updatedSchedule,
      center_id: centerId
    });
  } catch (e: any) {
    console.error('❌ Update schedule error:', e);
    console.error('📅 [Schedule PUT] Error stack:', e.stack);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
