import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_FALLBACK_ENABLED = process.env.AUTH_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');

    const body = await request.json();
    const { id } = await params;

    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/appointments/${id}/cancel`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader,
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // continue to fallback
      }
    }

    if (!AUTH_FALLBACK_ENABLED) {
      return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 });
    }

    // Supabase fallback: check 24-hour rule before cancelling
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, fetch the appointment to check timing
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time')
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({ success: false, message: 'Appointment not found' }, { status: 404 });
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ success: false, message: 'Appointment is already cancelled' }, { status: 400 });
    }

    // Check if cancellation is within 24 hours of appointment time
    if (appointment.appointment_date && appointment.appointment_time) {
      // Parse appointment date and time correctly
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const millisecondsUntilAppointment = appointmentDateTime.getTime() - now.getTime();
      const hoursUntilAppointment = millisecondsUntilAppointment / (1000 * 60 * 60);

      console.log('🔍 [Cancel Check]', {
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        appointmentDateTime: appointmentDateTime.toISOString(),
        now: now.toISOString(),
        millisecondsUntil: millisecondsUntilAppointment,
        hoursUntilAppointment: hoursUntilAppointment.toFixed(2),
        willBlock24h: hoursUntilAppointment < 24,
        willBlockPast: hoursUntilAppointment <= 0
      });

      // Check if appointment is in the past
      if (hoursUntilAppointment <= 0) {
        return NextResponse.json({
          success: false,
          message: 'Cannot cancel a past appointment',
          code: 'APPOINTMENT_IN_PAST'
        }, { status: 400 });
      }

      // Block cancellation if less than 24 hours away
      if (hoursUntilAppointment < 24) {
        return NextResponse.json({
          success: false,
          message: `Cannot cancel appointment within 24 hours of the scheduled time. Your appointment is in ${hoursUntilAppointment.toFixed(1)} hours. Please contact support for assistance.`,
          code: 'CANCELLATION_TOO_LATE',
          hoursRemaining: hoursUntilAppointment
        }, { status: 400 });
      }
    }

    // Update status to cancelled
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled', cancellation_reason: body?.reason || 'Cancelled by patient' })
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Proxy error (cancel):', error);
    return NextResponse.json({ success: false, message: 'Failed to cancel appointment' }, { status: 500 });
  }
}
