import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { doctorId: string } }
) {
  try {
    const { doctorId } = params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'start_date and end_date parameters are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get doctor's schedule from unified doctor_schedules table
    const { data: schedule, error } = await supabase
      .from('doctor_schedules')
      .select('day_of_week, is_available')
      .eq('doctor_id', doctorId)
      .eq('is_available', true);

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch doctor schedule', error: error.message },
        { status: 500 }
      );
    }

    // Extract working days from schedule
    const workingDays: number[] = Array.isArray(schedule) ? schedule.map((s: any) => s.day_of_week) : [];

    // Calculate available dates between start_date and end_date
    const availableDates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (workingDays.includes(dayOfWeek)) {
        availableDates.push(d.toISOString().split('T')[0]);
      }
    }

    return NextResponse.json({
      success: true,
      availableDates,
      workingDays,
      doctorId,
      message: workingDays.length > 0 ? 'Schedule loaded successfully' : 'No working days configured for this doctor'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
