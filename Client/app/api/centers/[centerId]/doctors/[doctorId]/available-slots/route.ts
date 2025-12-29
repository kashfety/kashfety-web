import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string; doctorId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const appointmentType = searchParams.get('appointment_type') || undefined;
    const { centerId, doctorId } = await params;

    if (!date) {
      return NextResponse.json({ success: false, message: 'Missing required date parameter' }, { status: 400 });
    }

    const qs = new URLSearchParams();
    qs.set('date', date);
    if (appointmentType) qs.set('appointment_type', appointmentType);
    qs.set('center_id', centerId);

    // Try backend first
    const url = `${BACKEND_URL}/api/doctors/${doctorId}/available-slots?${qs.toString()}`;
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        const data = await response.json();

        // Enrich with server-side booked computation to guarantee correctness
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: appts } = await supabase
          .from('appointments')
          .select('appointment_time')
          .eq('doctor_id', doctorId)
          .eq('appointment_date', date)
          .eq('center_id', centerId)
          .in('status', ['scheduled', 'confirmed']);
        const bookedTimes = (appts || []).map((a: any) => (a.appointment_time || '').slice(0,5));

        const srcSlots: any[] = Array.isArray(data.available_slots)
          ? data.available_slots
          : Array.isArray(data.slots)
            ? (data.slots as any[]).map((t: any) => ({ time: typeof t === 'string' ? t : (t?.time || t?.start_time || t?.slot_time), is_available: true }))
            : [];

        const available_slots = srcSlots
          .map((s: any) => typeof s === 'string' ? { time: s } : s)
          .map((s: any) => ({
            time: s.time || s.start_time || s.slot_time,
            is_available: s.is_available !== false,
            is_booked: false
          }))
          .filter((s: any) => s.time)
          .map((s: any) => ({ ...s, is_booked: bookedTimes.includes(s.time) }));

        return NextResponse.json({
          ...data,
          available_slots,
          booked_slots: bookedTimes
        }, { status: 200 });
      }
      // if not ok, fall through to Supabase computation
    } catch {}

    // Supabase fallback: compute available slots and booked flags for this center/date
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const requested = new Date(date);
    const dayOfWeek = requested.getDay();

    // Pull the schedule for this doctor, center and day
    const { data: schedule } = await supabase
      .from('doctor_schedules')
      .select('day_of_week, is_available, time_slots, consultation_fee, center_id')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('center_id', centerId)
      .eq('is_available', true)
      .maybeSingle();

    if (!schedule || schedule.is_available === false) {
      return NextResponse.json({
        success: true,
        available_slots: [],
        booked_slots: [],
        date,
        doctor_id: doctorId,
        center_id: centerId,
        message: 'Doctor not available on this day at this center'
      }, { status: 200 });
    }

    // Fetch appointments for this center/date and mark scheduled/confirmed as booked
    const { data: appts } = await supabase
      .from('appointments')
      .select('appointment_time, status, center_id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .eq('center_id', centerId)
      .in('status', ['scheduled', 'confirmed']);

    const bookedTimes = (appts || []).map((a: any) => (a.appointment_time || '').slice(0,5));

    const rawSlots: any[] = Array.isArray(schedule.time_slots) ? schedule.time_slots : [];
    const normalized = rawSlots
      .map((s: any) => typeof s === 'string' ? { time: s } : s)
      .map((s: any) => ({
        time: s.start_time || s.time || s.startTime || s.slot_time,
        is_available: s.is_available !== false,
      }))
      .filter((s: any) => s.time)
      .sort((a: any, b: any) => a.time.localeCompare(b.time));

    const available_slots = normalized.map((s: any) => ({
      ...s,
      is_booked: bookedTimes.includes(s.time)
    }));

    return NextResponse.json({
      success: true,
      available_slots,
      booked_slots: bookedTimes,
      date,
      doctor_id: doctorId,
      center_id: centerId,
      consultation_fee: schedule.consultation_fee || 0
    }, { status: 200 });
  } catch (error) {
    :', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch available slots' }, { status: 500 });
  }
}
