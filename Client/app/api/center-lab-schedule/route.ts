import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');
    const testTypeId = searchParams.get('testTypeId');

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    // Build query for center lab schedules
    let query = supabase
      .from('center_lab_schedules')
      .select(`
        *,
        lab_test_types!inner (
          id,
          name,
          description,
          default_duration,
          category
        )
      `)
      .eq('center_id', centerId)
      .eq('is_available', true);

    // Filter by test type if provided
    if (testTypeId) {
      query = query.eq('lab_test_type_id', testTypeId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error('Failed to fetch center schedules:', error);
      return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
    }

    // Group schedules by test type for easier consumption
    const groupedSchedules: Record<string, any> = {};
    
    schedules?.forEach(schedule => {
      const testTypeId = schedule.lab_test_type_id;
      if (!groupedSchedules[testTypeId]) {
        groupedSchedules[testTypeId] = {
          testType: schedule.lab_test_types,
          schedule: []
        };
      }
      
      // Parse time slots from JSON
      const timeSlots = typeof schedule.time_slots === 'string' 
        ? JSON.parse(schedule.time_slots) 
        : schedule.time_slots;
      
      groupedSchedules[testTypeId].schedule.push({
        day_of_week: schedule.day_of_week,
        is_available: schedule.is_available,
        slots: timeSlots || [],
        break_start: schedule.break_start,
        break_end: schedule.break_end,
        slot_duration: schedule.slot_duration,
        notes: schedule.notes
      });
    });

    return NextResponse.json({ 
      success: true, 
      schedules: groupedSchedules,
      // For backwards compatibility, also return flat array
      schedule: schedules || []
    });
  } catch (error) {
    console.error('Center schedule fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
