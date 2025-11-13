import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const { reason } = await request.json();

    console.log('📅 [Appointment Cancel] Request:', { appointmentId, reason });

    if (!appointmentId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Appointment ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, check if the appointment exists
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('❌ Appointment not found:', fetchError);
      return NextResponse.json({ 
        success: false, 
        message: 'Appointment not found' 
      }, { status: 404 });
    }

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({ 
        success: false, 
        message: 'Appointment is already cancelled' 
      }, { status: 400 });
    }

    // Check if cancellation is within 24 hours of appointment time
    if (appointment.appointment_date && appointment.appointment_time) {
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      console.log('⏰ [Appointment Cancel] Time check:', {
        appointmentDateTime: appointmentDateTime.toISOString(),
        now: now.toISOString(),
        hoursUntilAppointment: hoursUntilAppointment.toFixed(2)
      });

      if (hoursUntilAppointment <= 24 && hoursUntilAppointment > 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Cannot cancel appointment within 24 hours of the scheduled time. Please contact support for assistance.',
          code: 'CANCELLATION_TOO_LATE'
        }, { status: 400 });
      }

      // Also check if appointment is in the past
      if (hoursUntilAppointment < 0) {
        return NextResponse.json({ 
          success: false, 
          message: 'Cannot cancel a past appointment',
          code: 'APPOINTMENT_IN_PAST'
        }, { status: 400 });
      }
    }

    // Update the appointment status to cancelled
    console.log('💾 Cancelling appointment...');
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || 'Cancelled by doctor',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ Failed to cancel appointment:', updateError);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to cancel appointment',
        error: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ [Appointment Cancel] Appointment cancelled successfully');
    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment
    });

  } catch (error: any) {
    console.error('❌ Appointment cancel error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    }, { status: 500 });
  }
}

