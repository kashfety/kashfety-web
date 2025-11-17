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
      console.error('📅 [Schedule GET] Error details:', JSON.stringify(error, null, 2));
      
      // Try a simpler query without joins as fallback
      console.log('📅 [Schedule GET] Trying fallback query without joins...');
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
        console.error('📅 [Schedule GET] Fallback query also failed:', simpleError);
        throw error; // Throw original error
      }
      
      console.log('📅 [Schedule GET] Fallback query succeeded');
      // Use the simple query results instead
      const scheduleWithFallback = scheduleSimple;
      
      // Continue with the fallback data
      console.log('📅 [Schedule GET] Found', scheduleWithFallback?.length || 0, 'schedule entries (fallback)');
      
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
    
    console.log('📅 [Schedule GET] Found', schedule?.length || 0, 'schedule entries');
    
    // Ensure schedule is an array and has proper structure
    const scheduleArray = Array.isArray(schedule) ? schedule : [];
    
    // Log detailed schedule data for debugging
    if (scheduleArray.length > 0) {
      console.log('📅 [Schedule GET] Schedule data:', JSON.stringify(scheduleArray, null, 2));
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
      console.log('📅 [Schedule GET] No schedule entries found - returning empty array');
    }
    
    // Get doctor's home visit availability and consultation fee
    console.log('📅 [Schedule GET] Fetching doctor profile...');
    const { data: doctor, error: doctorError } = await supabase
      .from('users')
      .select('home_visits_available, consultation_fee')
      .eq('id', doctorId)
      .single();
    
    if (doctorError) {
      console.error('📅 [Schedule GET] Doctor fetch error:', doctorError);
    } else {
      console.log('📅 [Schedule GET] Doctor profile:', {
        home_visits_available: doctor?.home_visits_available,
        consultation_fee: doctor?.consultation_fee
      });
    }
    
    // Group schedule by center if no specific center requested
    let groupedSchedule: any = {};
    if (!centerId) {
      console.log('📅 [Schedule GET] Grouping schedules by center...');
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
      console.log('📅 [Schedule GET] Grouped into', Object.keys(groupedSchedule).length, 'centers');
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
    
    // ============================================
    // TIME CONFLICT VALIDATION (Pre-check)
    // ============================================
    // Check for time conflicts BEFORE attempting any saves
    console.log('🔍 Pre-checking for time conflicts with other centers...');
    
    const daysToCheck = scheduleArray.map((item: any) => item.day_of_week);
    
    if (daysToCheck.length > 0) {
      const { data: existingSchedules, error: existingError } = await supabase
        .from('doctor_schedules')
        .select('day_of_week, time_slots, center_id, centers:center_id(name)')
        .eq('doctor_id', doctorId)
        .in('day_of_week', daysToCheck)
        .neq('center_id', centerId);
      
      if (!existingError && existingSchedules && existingSchedules.length > 0) {
        console.log('📅 Found', existingSchedules.length, 'existing schedules at other centers to check');
        
        const conflicts: any[] = [];
        
        for (const newScheduleItem of scheduleArray) {
          const dayOfWeek = newScheduleItem.day_of_week;
          const newTimeSlots = newScheduleItem.time_slots || [];
          
          const existingForDay = existingSchedules.filter((s: any) => s.day_of_week === dayOfWeek);
          
          for (const existing of existingForDay) {
            const existingTimeSlots = existing.time_slots || [];
            const centerName = existing.centers?.name || 'Unknown Center';
            
            for (const newSlot of newTimeSlots) {
              const newStart = new Date(`2000-01-01T${newSlot.time}:00`);
              const newEnd = new Date(newStart.getTime() + (newSlot.duration || 30) * 60000);
              
              for (const existingSlot of existingTimeSlots) {
                const existingStart = new Date(`2000-01-01T${existingSlot.time}:00`);
                const existingEnd = new Date(existingStart.getTime() + (existingSlot.duration || 30) * 60000);
                
                if (newStart < existingEnd && newEnd > existingStart) {
                  conflicts.push({
                    day: dayOfWeek,
                    newSlot: newSlot.time,
                    existingSlot: existingSlot.time,
                    conflictingCenter: centerName,
                    conflictingCenterId: existing.center_id
                  });
                }
              }
            }
          }
        }
        
        if (conflicts.length > 0) {
          console.error('⚠️ Time conflicts detected:', conflicts);
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const conflictMessages = conflicts.map(c => 
            `${dayNames[c.day]} at ${c.newSlot} conflicts with existing schedule at ${c.conflictingCenter}`
          );
          
          return NextResponse.json({ 
            error: 'Schedule conflict detected',
            message: 'You cannot have overlapping time slots on the same day at different centers.',
            conflicts: conflictMessages,
            details: conflicts
          }, { status: 409 });
        }
        
        console.log('✅ No time conflicts detected');
      }
    }
    // ============================================
    // END TIME CONFLICT VALIDATION
    // ============================================
    
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
      
      // IMPORTANT: Database has unique constraint on (doctor_id, day_of_week)
      // NOT (doctor_id, day_of_week, center_id)
      // So we need to delete based on the specific days we're about to insert
      
      // Extract the days we're about to insert
      const daysToInsert = scheduleArray.map((item: any) => item.day_of_week);
      console.log('📅 Days to insert:', daysToInsert);
      
      // Conflict check already done at the top, proceed with deletion and insertion
      if (daysToInsert.length > 0) {
        // Delete existing schedules for this doctor and these specific days
        console.log('🗑️ Deleting existing schedules for doctor:', doctorId, 'days:', daysToInsert);
        const { error: delErr } = await supabase
          .from('doctor_schedules')
          .delete()
          .eq('doctor_id', doctorId)
          .in('day_of_week', daysToInsert);
        
        if (delErr) {
          console.error('❌ Delete error:', delErr);
          throw delErr;
        }
        console.log('✅ Existing schedules deleted for days:', daysToInsert);
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
