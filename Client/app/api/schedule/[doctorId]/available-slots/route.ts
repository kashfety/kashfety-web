import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: { doctorId: string } }
) {
  try {
    const { doctorId } = params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, message: 'Date parameter is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the day of week for the requested date
    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.getDay();

    // Get doctor's schedule for this day of week from unified doctor_schedules table
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('day_of_week, is_available, time_slots, consultation_fee')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (scheduleError || !schedule || !schedule.is_available) {
      return NextResponse.json({
        success: true,
        slots: [],
        doctorId,
        date,
        message: 'Doctor is not available on this day'
      });
    }

    // Get existing appointments for this doctor on this date (exclude cancelled and no_show; block scheduled/confirmed)
    const { data: appointments } = await supabase
      .from('appointments')
      .select('appointment_time, status')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed']);

    const bookedTimes = (appointments || []).map((apt: any) => {
      const t: string = apt.appointment_time;
      return t && t.length === 8 ? t.substring(0, 5) : t;
    });

    // Extract time slots and normalize to HH:MM strings
    const timeSlots: any[] = (schedule.time_slots as any[]) || [];
    const normalized = timeSlots
      .filter((slot: any) => slot && slot.is_available !== false)
      .map((slot: any) => ({
        time: typeof slot === 'string' ? slot : (slot.start_time || slot.time || slot.startTime || slot.slot_time),
        is_available: slot?.is_available !== false
      }))
      .filter((s: any) => s.time)
      .sort((a: any, b: any) => a.time.localeCompare(b.time));

    const slots = normalized.filter((s: any) => !bookedTimes.includes(s.time)).map((s: any) => s.time);

    // Also provide enriched format for UIs that expect is_booked flag
    const enriched = normalized.map((s: any) => ({ ...s, is_booked: bookedTimes.includes(s.time) }));

    return NextResponse.json({
      success: true,
      slots,
      doctorId,
      date,
      consultationFee: schedule.consultation_fee || 0,
      bookedSlots: bookedTimes,
      available_slots: enriched
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}
