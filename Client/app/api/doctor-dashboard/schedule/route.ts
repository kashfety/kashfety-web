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
      if (response.ok) {
        return NextResponse.json(data);
      }
    } catch (e) {
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
        } catch { }
      }
    }
    const centerId = searchParams.get('center_id');


    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query
    let query = supabase
      .from('doctor_schedules')
      .select('*, centers:center_id(id, name, name_ar, address)')
      .eq('doctor_id', doctorId);

    // Filter by center if specified
    if (centerId) {
      query = query.eq('center_id', centerId);

      // Verify assignment for specific center
      const { data: assignment, error: aErr } = await supabase
        .from('doctor_centers')
        .select('center_id')
        .eq('doctor_id', doctorId)
        .eq('center_id', centerId)
        .single();

      if (aErr || !assignment) {
        return NextResponse.json({ error: 'You are not assigned to this center' }, { status: 403 });
      }
    }

    query = query.order('center_id').order('day_of_week', { ascending: true });

    const { data: schedule, error } = await query;

    if (error) {

      // Try a simpler query without joins as fallback
      let fallbackQuery = supabase
        .from('doctor_schedules')
        .select('*')
        .eq('doctor_id', doctorId);

      if (centerId) {
        fallbackQuery = fallbackQuery.eq('center_id', centerId);
      }

      fallbackQuery = fallbackQuery.order('day_of_week', { ascending: true });

      const { data: scheduleSimple, error: simpleError } = await fallbackQuery;

      if (simpleError) {
        throw error; // Throw original error
      }

      // Use the simple query results instead
      const scheduleWithFallback = scheduleSimple;


      // Get doctor info and return
      const { data: doctor } = await supabase
        .from('users')
        .select('home_visits_available, consultation_fee')
        .eq('id', doctorId)
        .single();

      return NextResponse.json({
        success: true,
        schedule: scheduleWithFallback || [],
        home_visits_available: doctor?.home_visits_available || false,
        default_consultation_fee: doctor?.consultation_fee || null,
        center_specific: !!centerId
      });
    }


    // Ensure schedule is an array and has proper structure
    const scheduleArray = Array.isArray(schedule) ? schedule : [];

    // Log detailed schedule data for debugging
    if (scheduleArray.length > 0) {
      scheduleArray.forEach((item: any, idx: number) => {
        console.log(`📅 [Schedule GET] Item ${idx}:`, {
          day_of_week: item.day_of_week,
          is_available: item.is_available,
          slots_count: item.time_slots?.length || 0,
          has_break: !!(item.break_start && item.break_end),
          center_id: item.center_id
        });
      });
    } else {
    }

    // Get doctor's home visit availability and consultation fee
    const { data: doctor, error: doctorError } = await supabase
      .from('users')
      .select('home_visits_available, consultation_fee')
      .eq('id', doctorId)
      .single();

    if (doctorError) {
    } else {
      console.log('📅 [Schedule GET] Doctor profile:', {
        home_visits_available: doctor?.home_visits_available,
        consultation_fee: doctor?.consultation_fee
      });
    }

    // Group schedule by center if no specific center requested
    let groupedSchedule: any = {};
    if (!centerId) {
      scheduleArray.forEach((item: any) => {
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

    const responseData = {
      success: true,
      schedule: centerId ? scheduleArray : Object.values(groupedSchedule),
      home_visits_available: doctor?.home_visits_available || false,
      default_consultation_fee: doctor?.consultation_fee || null,
      center_specific: !centerId
    };

    console.log('📅 [Schedule GET] Response:', {
      success: responseData.success,
      schedule_count: centerId ? scheduleArray.length : Object.keys(groupedSchedule).length,
      home_visits_available: responseData.home_visits_available,
      default_consultation_fee: responseData.default_consultation_fee
    });

    return NextResponse.json(responseData);
  } catch (e: any) {
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
        } catch { }
      }
    }
    const centerId = searchParams.get('center_id') || body?.center_id;


    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    if (!centerId) return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
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

    if (aErr || !assignment) {
      return NextResponse.json({ error: 'You are not assigned to this medical center. Please go to Centers tab to select your assigned centers first.' }, { status: 403 });
    }

    // Validate schedule format
    if (scheduleArray.length === 0) {
    }

    // ============================================
    // NOTE: Conflict validation removed
    // ============================================
    // Doctors are now allowed to have overlapping schedules at different centers
    // on the same day. This allows flexibility for doctors who work at multiple
    // locations or manage their schedules across different centers.
    // Conflict detection only applies within the same center (handled during deletion/insertion).
    // ============================================

    // Try to use the database function first (if it exists)
    const { error: funcError } = await supabase
      .rpc('setup_doctor_weekly_schedule', {
        p_doctor_id: doctorId,
        p_schedule: scheduleArray,
        p_center_id: centerId
      });

    // If RPC function doesn't exist or fails, use manual insert approach
    if (funcError) {

      // Extract the days we're about to insert
      const daysToInsert = scheduleArray.map((item: any) => item.day_of_week);

      // Delete existing schedules for this doctor, center, and these specific days
      // This ensures we can insert fresh data without conflicts
      if (daysToInsert.length > 0) {
        const { error: delErr } = await supabase
          .from('doctor_schedules')
          .delete()
          .eq('doctor_id', doctorId)
          .eq('center_id', centerId)
          .in('day_of_week', daysToInsert);

        if (delErr) {
          throw delErr;
        }
      }

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

      // Try to insert new schedules
      // If the database constraint hasn't been updated yet, this will fail with a unique constraint error
      // In that case, we'll provide a helpful error message
      const { error: insErr } = await supabase
        .from('doctor_schedules')
        .insert(rows);

      if (insErr) {
        // Check if it's the unique constraint error
        if (insErr.code === '23505' && insErr.message?.includes('doctor_schedules_doctor_id_day_of_week_key')) {
          return NextResponse.json({
            error: 'Database constraint violation',
            message: 'The database constraint needs to be updated to allow schedules at multiple centers on the same day. Please run the migration script: migrations/fix_doctor_schedules_constraint.sql',
            details: 'The current database only allows one schedule per doctor per day. To allow schedules at multiple centers, the unique constraint must include center_id.',
            migration_script: 'migrations/fix_doctor_schedules_constraint.sql'
          }, { status: 409 });
        }
        throw insErr;
      }
    } else {
    }


    // Get the updated schedule for this specific center
    const { data: updatedSchedule, error: fetchError } = await supabase
      .from('doctor_schedules')
      .select('*, centers:center_id(id, name, name_ar, address)')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .order('day_of_week');

    if (fetchError) {
      throw fetchError;
    }


    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: updatedSchedule,
      center_id: centerId
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
