import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string; typeId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const { centerId, typeId } = await params;

    if (!centerId || !typeId) {
      return NextResponse.json({ error: 'Center ID and Type ID are required' }, { status: 400 });
    }

    // Calculate date range (default to next 30 days)
    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Get lab schedule for this center and test type
    const { data: schedule, error: scheduleError } = await supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', centerId)
      .eq('lab_test_type_id', typeId)
      .eq('is_available', true);

    if (scheduleError) {
      return NextResponse.json({ error: 'Failed to fetch lab schedule' }, { status: 500 });
    }


    const availableDates = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dateStr = current.toISOString().split('T')[0];

      // Check if this day has available schedule
      const daySchedule = schedule?.find((s: any) => s.day_of_week === dayOfWeek);
      :`, { found: !!daySchedule, isAvailable: daySchedule?.is_available });
      
      if (daySchedule && daySchedule.is_available) {
        // Parse time_slots if it's a JSON string
        let timeSlots = daySchedule.time_slots;
        if (typeof timeSlots === 'string') {
          try {
            timeSlots = JSON.parse(timeSlots);
          } catch (e) {
            timeSlots = [];
          }
        }
        
        const slotsCount = Array.isArray(timeSlots) ? timeSlots.length : 0;
        
        availableDates.push({
          date: dateStr,
          day_of_week: dayOfWeek,
          available_slots: slotsCount
        });
      }

      current.setDate(current.getDate() + 1);
    }


    return NextResponse.json({
      success: true,
      available_dates: availableDates,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0],
      center_id: centerId,
      lab_test_type_id: typeId
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
