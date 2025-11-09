import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');
    const typeId = searchParams.get('typeId');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!centerId || !typeId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Center ID and Type ID are required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Calculate date range (default to next 30 days)
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get lab schedule for this center and test type
    console.log('🔍 [Lab Available Dates] Fetching schedule for:', { centerId, typeId });
    const { data: schedule, error: scheduleError } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('is_available', true);

    if (scheduleError) {
      console.error('❌ Failed to fetch lab schedule:', scheduleError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch lab schedule' 
      }, { status: 500 });
    }

    console.log('📅 Found schedule data:', { count: schedule?.length || 0 });

    const availableDates = [];
    const current = new Date(start);

    // If no schedule exists, provide default working days (Monday-Friday, 0-4 or 1-5)
    const hasSchedule = schedule && schedule.length > 0;
    
    if (!hasSchedule) {
      console.log('⚠️ No schedule found, using default working days (Monday-Friday)');
    }

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dateStr = current.toISOString().split('T')[0];

      let shouldInclude = false;
      let slotsCount = 0;

      if (hasSchedule) {
        // Check if this day has available schedule
        const daySchedule = schedule?.find((s: any) => s.day_of_week === dayOfWeek);
        
        if (daySchedule && daySchedule.is_available) {
          // Parse time_slots if it's a JSON string
          let timeSlots = daySchedule.time_slots;
          if (typeof timeSlots === 'string') {
            try {
              timeSlots = JSON.parse(timeSlots);
            } catch (e) {
              console.error('Failed to parse time_slots JSON:', e);
              timeSlots = [];
            }
          }
          
          slotsCount = Array.isArray(timeSlots) ? timeSlots.length : 0;
          shouldInclude = slotsCount > 0;
        }
      } else {
        // Default: Monday (1) to Friday (5) are working days
        shouldInclude = dayOfWeek >= 1 && dayOfWeek <= 5;
        slotsCount = 16; // Default slots (8 AM - 4 PM, every 30 min)
      }

      if (shouldInclude) {
        availableDates.push({
          date: dateStr,
          day_of_week: dayOfWeek,
          available_slots: slotsCount
        });
      }

      current.setDate(current.getDate() + 1);
    }

    console.log('✅ [Lab Available Dates] Found', availableDates.length, 'available dates');

    return NextResponse.json({
      success: true,
      available_dates: availableDates,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      center_id: centerId,
      lab_test_type_id: typeId
    });

  } catch (error: any) {
    console.error('❌ Lab available dates API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

