import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Proxy to backend available slots endpoint. Uses public backend route to avoid requiring auth in the modal.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const centerId = searchParams.get('center_id');
    const appointmentType = searchParams.get('appointment_type') || undefined;
    const excludeAppointmentId = searchParams.get('exclude_appointment_id'); // For rescheduling

    if (!date) {
      return NextResponse.json({ success: false, message: 'Missing required date parameter' }, { status: 400 });
    }

    const qs = new URLSearchParams();
    qs.set('date', date);
    if (centerId) qs.set('center_id', centerId);
    if (appointmentType) qs.set('appointment_type', appointmentType);

    // Prefer the backend doctors public route (no auth required)
    const { doctorId } = await context.params;
    const url = `${BACKEND_URL}/api/doctors/${doctorId}/available-slots?${qs.toString()}`;

    try {
      const response = await fetch(url, { method: 'GET' });
      const status = response.status;
      if (response.ok) {
        const data = await response.json();

        // Enrich with server-side booked computation to guarantee correctness
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        let apptsQuery = supabase
          .from('appointments')
          .select('id, appointment_time, status, center_id')
          .eq('doctor_id', doctorId)
          .eq('appointment_date', date)
          .in('status', ['scheduled', 'confirmed']);
        
        // Exclude the current appointment if rescheduling
        if (excludeAppointmentId) {
          apptsQuery = apptsQuery.neq('id', excludeAppointmentId);
        }
        
        const { data: appts } = await apptsQuery;

        const toHHMM = (t: string | null | undefined): string | null => {
          if (!t) return null;
          const parts = t.split(':');
          if (parts.length >= 2) {
            const h = String(Number(parts[0])).padStart(2, '0');
            const m = String(Number(parts[1])).padStart(2, '0');
            return `${h}:${m}`;
          }
          return t.length === 5 ? t : null;
        };

        const bookedTimes = (appts || [])
          .filter((a: any) => {
            if (!centerId) return true;
            // Treat null/undefined center_id as matching any center to avoid missing legacy rows
            return a.center_id == null || a.center_id === centerId;
          })
          .map((a: any) => toHHMM(a.appointment_time))
          .filter((v: any) => !!v) as string[];

        const srcSlots: any[] = Array.isArray(data.available_slots)
          ? data.available_slots
          : Array.isArray(data.slots)
            ? (data.slots as any[]).map((t: any) => ({ time: typeof t === 'string' ? t : (t?.time || t?.start_time || t?.slot_time), is_available: true }))
            : [];

        const normalized = srcSlots
          .map((s: any) => typeof s === 'string' ? { time: s } : s)
          .map((s: any) => ({
            time: toHHMM(s.time || s.start_time || s.slot_time),
            is_available: s.is_available !== false,
            is_booked: false
          }))
          .filter((s: any) => s.time)
          .sort((a: any, b: any) => (a.time as string).localeCompare(b.time as string))
          .map((s: any) => ({ ...s, is_booked: bookedTimes.includes(s.time) }));

        return NextResponse.json({
          success: true,
          available_slots: normalized,
          booked_slots: bookedTimes,
          date,
          doctor_id: doctorId,
          consultation_fee: data.consultation_fee || data.consultationFee || 0
        }, { status });
      }
      if (status === 401 || status === 403 || status === 404 || status >= 500) {
        // FALLBACK below
      } else {
        // Unexpected non-ok but not auth/server error -> still fallback to be safe
      }
    } catch (e) {
      // Network or unexpected error – fall through to fallback
    }

    // FALLBACK: compute slots directly from DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine day of week from the requested date (local-safe parsing)
    const requested = new Date(date);
    const dayOfWeek = requested.getDay();

    // Query doctor_schedules for that day and center (if provided)
    let baseQuery = supabase
      .from('doctor_schedules')
      .select('day_of_week, is_available, time_slots, consultation_fee, center_id')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);
    if (centerId) baseQuery = baseQuery.eq('center_id', centerId);
    const { data: schedule } = await baseQuery.single();

    if (!schedule || schedule.is_available === false) {
      return NextResponse.json({
        success: true,
        available_slots: [],
        booked_slots: [],
        date,
        doctor_id: doctorId,
        message: 'Doctor not available on this day'
      }, { status: 200 });
    }

    // Get existing appointments for this date (block scheduled/confirmed)
    let apptsQuery = supabase
      .from('appointments')
      .select('id, appointment_time, status, center_id')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed']);
    
    // Exclude the current appointment if rescheduling
    if (excludeAppointmentId) {
      apptsQuery = apptsQuery.neq('id', excludeAppointmentId);
    }
    
    const { data: appts } = await apptsQuery;

    const toHHMM = (t: string | null | undefined): string | null => {
      if (!t) return null;
      const parts = t.split(':');
      if (parts.length >= 2) {
        const h = String(Number(parts[0])).padStart(2, '0');
        const m = String(Number(parts[1])).padStart(2, '0');
        return `${h}:${m}`;
      }
      return t.length === 5 ? t : null;
    };

    const bookedTimes = (appts || [])
      .filter((a: any) => {
        if (!centerId) return true;
        return a.center_id == null || a.center_id === centerId;
      })
      .map((a: any) => toHHMM(a.appointment_time))
      .filter((v: any) => !!v) as string[];

    const rawSlots: any[] = Array.isArray(schedule.time_slots) ? schedule.time_slots : [];
    const normalized = rawSlots
      .map((s: any) => typeof s === 'string' ? { time: s } : s)
      .map((s: any) => ({
        time: toHHMM(s.start_time || s.time || s.startTime || s.slot_time),
        is_available: s.is_available !== false,
        is_booked: false
      }))
      .filter((s: any) => s.time)
      .sort((a: any, b: any) => (a.time as string).localeCompare(b.time as string))
      .map((s: any) => ({ ...s, is_booked: bookedTimes.includes(s.time) }));

    return NextResponse.json({
      success: true,
      available_slots: normalized,
      booked_slots: bookedTimes,
      date,
      doctor_id: doctorId,
      consultation_fee: schedule.consultation_fee || 0
    }, { status: 200 });
  } catch (error) {
    console.error('Proxy error (available slots):', error);
    return NextResponse.json({ success: false, message: 'Failed to fetch available slots' }, { status: 500 });
  }
}
