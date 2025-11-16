import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromAuth } from '../utils/jwt-auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Lab Schedule GET request received');
    const { searchParams } = new URL(request.url);
    const labTestTypeId = searchParams.get('lab_test_type_id');
    const centerId = searchParams.get('center_id');
    
    console.log('📋 Lab Schedule params:', { labTestTypeId, centerId });

    const user = await getUserFromAuth(request);
    
    if (!user || user.role !== 'center') {
      console.log('❌ Lab Schedule - Unauthorized user:', user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const activeCenterId = centerId || user.center_id || user.id;
    console.log('🏢 Lab Schedule - Using center ID:', activeCenterId);

    let query = supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', activeCenterId);

    if (labTestTypeId) {
      query = query.eq('lab_test_type_id', labTestTypeId);
    }

    console.log('🔍 Lab Schedule - Querying schedules...');
    const { data: schedule, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch lab schedule:', error);
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    // Parse time_slots JSON strings back to arrays
    const parsedSchedule = (schedule || []).map((daySchedule: any) => ({
      ...daySchedule,
      time_slots: typeof daySchedule.time_slots === 'string' 
        ? JSON.parse(daySchedule.time_slots || '[]')
        : daySchedule.time_slots || []
    }));

    console.log('✅ Lab Schedule found:', { count: parsedSchedule?.length || 0 });
    return NextResponse.json({ schedule: parsedSchedule });
  } catch (error) {
    console.error('💥 Lab Schedule fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('📝 [Lab Schedule PUT] Request received');
    
    const user = await getUserFromAuth(request);
    console.log('👤 [Lab Schedule PUT] User from auth:', { 
      id: user?.id, 
      role: user?.role, 
      center_id: user?.center_id 
    });
    
    if (!user || user.role !== 'center') {
      console.error('❌ [Lab Schedule PUT] Unauthorized - user:', user);
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
    console.log('🏢 [Lab Schedule PUT] Using center_id:', centerId);

    // ============================================
    // VALIDATION: Check for timing conflicts with existing schedules for OTHER test types
    // ============================================
    console.log('🔍 [Lab Schedule PUT] Checking for timing conflicts...');
    
    // Get all existing schedules for this center for OTHER test types
    const { data: existingSchedules, error: fetchError } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .neq('lab_test_type_id', lab_test_type_id); // Exclude the test type we're updating

    if (fetchError) {
      console.error('❌ Failed to fetch existing schedules:', fetchError);
      return NextResponse.json({ error: 'Failed to validate schedule conflicts' }, { status: 500 });
    }

    console.log(`📋 Found ${existingSchedules?.length || 0} existing schedules for other test types`);

    // Check for conflicts
    const conflicts: string[] = [];
    
    for (const newDay of schedule) {
      if (!newDay.is_available || !Array.isArray(newDay.slots) || newDay.slots.length === 0) {
        continue; // Skip unavailable days or days without slots
      }

      const dayOfWeek = Number(newDay.day_of_week);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = dayNames[dayOfWeek] || `Day ${dayOfWeek}`;

      // Find existing schedules for the same day of week
      const sameDaySchedules = (existingSchedules || []).filter((existing: any) => 
        existing.day_of_week === dayOfWeek && existing.is_available
      );

      if (sameDaySchedules.length === 0) continue; // No conflict possible

      // Convert new schedule slots to time ranges for comparison
      for (const newSlot of newDay.slots) {
        const newTime = typeof newSlot === 'string' ? newSlot : (newSlot.time || newSlot.start_time);
        const newDuration = typeof newSlot === 'object' ? (newSlot.duration || newDay.slot_duration || 30) : (newDay.slot_duration || 30);
        
        if (!newTime) continue;

        // Parse new slot time
        const [newHour, newMin] = newTime.split(':').map(Number);
        const newStartMinutes = newHour * 60 + newMin;
        const newEndMinutes = newStartMinutes + newDuration;

        // Check against all existing schedules on this day
        for (const existing of sameDaySchedules) {
          // Get test type name for better error message
          const { data: testTypeData } = await supabase
            .from('lab_test_types')
            .select('name')
            .eq('id', existing.lab_test_type_id)
            .single();
          
          const existingTestName = testTypeData?.name || 'Another test';

          // Parse existing time slots
          const existingSlots = typeof existing.time_slots === 'string' 
            ? JSON.parse(existing.time_slots || '[]')
            : existing.time_slots || [];

          for (const existingSlot of existingSlots) {
            const existingTime = typeof existingSlot === 'string' ? existingSlot : existingSlot.time;
            const existingDuration = typeof existingSlot === 'object' ? (existingSlot.duration || existing.slot_duration || 30) : (existing.slot_duration || 30);
            
            if (!existingTime) continue;

            const [existingHour, existingMin] = existingTime.split(':').map(Number);
            const existingStartMinutes = existingHour * 60 + existingMin;
            const existingEndMinutes = existingStartMinutes + existingDuration;

            // Check for overlap: two time slots overlap if one starts before the other ends
            const hasOverlap = (
              (newStartMinutes < existingEndMinutes && newEndMinutes > existingStartMinutes)
            );

            if (hasOverlap) {
              const conflictMsg = `${dayName} at ${newTime} conflicts with existing schedule for ${existingTestName} at ${existingTime}`;
              conflicts.push(conflictMsg);
              console.log('⚠️ Conflict detected:', conflictMsg);
            }
          }
        }
      }
    }

    // If conflicts detected, return 409 with details
    if (conflicts.length > 0) {
      console.log(`❌ Found ${conflicts.length} scheduling conflict(s)`);
      return NextResponse.json({
        error: 'schedule_conflict',
        message: 'You cannot have overlapping time slots on the same day for different test types.',
        conflicts: conflicts
      }, { status: 409 });
    }

    console.log('✅ No timing conflicts detected');

    // First, delete existing schedule for this test type
    const { error: deleteError } = await supabase
      .from('center_lab_schedules')
      .delete()
      .eq('center_id', centerId)
      .eq('lab_test_type_id', lab_test_type_id);

    if (deleteError) {
      console.error('❌ Failed to delete existing schedule:', deleteError);
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

    console.log('💾 [Lab Schedule PUT] Preparing to insert', scheduleInserts.length, 'schedule entries');
    console.log('💾 [Lab Schedule PUT] Schedule inserts data:', JSON.stringify(scheduleInserts, null, 2));

    // Insert the new schedule if there are any entries
    if (scheduleInserts.length > 0) {
      console.log('📤 [Lab Schedule PUT] Inserting into center_lab_schedules table...');
      const { data, error } = await supabase
        .from('center_lab_schedules')
        .insert(scheduleInserts)
        .select();

      if (error) {
        console.error('❌ [Lab Schedule PUT] Failed to save schedule:', error);
        console.error('❌ [Lab Schedule PUT] Error details:', JSON.stringify(error, null, 2));
        console.error('❌ [Lab Schedule PUT] Error code:', error.code);
        console.error('❌ [Lab Schedule PUT] Error message:', error.message);
        console.error('❌ [Lab Schedule PUT] Error hint:', error.hint);
        return NextResponse.json({ 
          error: 'Failed to save schedule', 
          details: error.message,
          code: error.code,
          hint: error.hint
        }, { status: 500 });
      }

      console.log('✅ [Lab Schedule PUT] Successfully saved', data?.length || 0, 'schedule entries');
      console.log('✅ [Lab Schedule PUT] Inserted data:', JSON.stringify(data, null, 2));
    } else {
      console.warn('⚠️ [Lab Schedule PUT] No schedule entries to insert (all days are unavailable or have no slots)');
      console.warn('⚠️ [Lab Schedule PUT] Original schedule array length:', schedule.length);
      console.warn('⚠️ [Lab Schedule PUT] Filtered schedule:', schedule.map((d: any) => ({
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
    console.error('💥 [Lab Schedule PUT] Schedule save error:', error);
    console.error('💥 [Lab Schedule PUT] Error stack:', error.stack);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}
