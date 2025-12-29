import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromAuth } from '../utils/jwt-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const labTestTypeId = searchParams.get('lab_test_type_id');
    const centerId = searchParams.get('center_id');
    

    const user = await getUserFromAuth(request);
    
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const activeCenterId = centerId || user.center_id || user.id;

    let query = supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', activeCenterId);

    if (labTestTypeId) {
      query = query.eq('lab_test_type_id', labTestTypeId);
    }

    const { data: schedule, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    // Parse time_slots JSON strings back to arrays
    const parsedSchedule = (schedule || []).map((daySchedule: any) => ({
      ...daySchedule,
      time_slots: typeof daySchedule.time_slots === 'string' 
        ? JSON.parse(daySchedule.time_slots || '[]')
        : daySchedule.time_slots || []
    }));

    return NextResponse.json({ schedule: parsedSchedule });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    
    const user = await getUserFromAuth(request);
    console.log('👤 [Lab Schedule PUT] User from auth:', { 
      id: user?.id, 
      role: user?.role, 
      center_id: user?.center_id 
    });
    
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    console.log('📦 [Lab Schedule PUT] Request body:', { 
      lab_test_type_id: body.lab_test_type_id,
      schedule_length: body.schedule?.length,
      schedule: body.schedule
    });
    
    const { lab_test_type_id, schedule } = body;
    
    if (!lab_test_type_id || !Array.isArray(schedule)) {
      console.error('❌ [Lab Schedule PUT] Invalid request data:', { 
        has_lab_test_type_id: !!lab_test_type_id,
        is_array: Array.isArray(schedule),
        schedule_type: typeof schedule
      });
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const centerId = user.center_id || user.id;

    // ============================================
    // NOTE: Conflict validation removed for lab schedules
    // ============================================
    // Different lab test types are allowed to have overlapping schedules on the same day.
    // This allows centers to offer multiple test types simultaneously, which is common
    // in medical centers where different tests can be performed in parallel.
    // ============================================

    // First, delete existing schedule for this test type
    const { error: deleteError } = await supabase
      .from('center_lab_schedules')
      .delete()
      .eq('center_id', centerId)
      .eq('lab_test_type_id', lab_test_type_id);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete existing schedule', details: deleteError.message }, { status: 500 });
    }

    // Filter and prepare schedule inserts - only include available days with slots
    const scheduleInserts = schedule
      .filter((day: any) => {
        // Only include days that are available and have valid slots
        const hasSlots = Array.isArray(day.slots) && day.slots.length > 0;
        const isAvailable = day.is_available !== false; // Default to true if not specified
        return isAvailable && hasSlots;
      })
      .map((day: any) => {
        // Format time_slots as array of objects with time and duration
        // The slots from frontend are already in format: [{ time: string, duration: number }]
        const timeSlots = day.slots
          .map((slot: any) => {
            // Handle both string and object formats
            const time = typeof slot === 'string' 
              ? slot 
              : (slot.time || slot.start_time || slot.slot_time || '');
            const duration = typeof slot === 'object' && slot.duration !== undefined
              ? slot.duration
              : (day.slot_duration || 30);
            
            return { time, duration };
          })
          .filter((slot: any) => slot.time); // Remove any invalid slots

        // Validate day_of_week is between 0-6
        const dayOfWeek = Number(day.day_of_week);
        if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
          throw new Error(`Invalid day_of_week: ${day.day_of_week}. Must be between 0-6.`);
        }

        return {
          center_id: centerId,
          lab_test_type_id,
          day_of_week: dayOfWeek,
          is_available: true,
          time_slots: timeSlots, // Pass as array, Supabase will handle jsonb conversion
          break_start: day.break_start || null,
          break_end: day.break_end || null,
          slot_duration: day.slot_duration || 30,
          notes: day.notes || null
        };
      });

    );

    // Insert the new schedule if there are any entries
    if (scheduleInserts.length > 0) {
      const { data, error } = await supabase
        .from('center_lab_schedules')
        .insert(scheduleInserts)
        .select();

      if (error) {
        );
        return NextResponse.json({ 
          error: 'Failed to save schedule', 
          details: error.message,
          code: error.code,
          hint: error.hint
        }, { status: 500 });
      }

      );
    } else {
      ');
       => ({
        day_of_week: d.day_of_week,
        is_available: d.is_available,
        slots_count: d.slots?.length || 0,
        slots: d.slots
      })));
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully saved ${scheduleInserts.length} schedule entries`,
      entries_saved: scheduleInserts.length
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
