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
      .select('id, status, appointment_date')
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

