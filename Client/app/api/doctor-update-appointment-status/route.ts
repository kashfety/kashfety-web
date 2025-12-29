import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 [Doctor Update Appointment Status] PUT request received');
    
    // Require doctor authentication
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;
    
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId') || searchParams.get('appointment_id');
    
    const body = await request.json();
    const status = body?.status || searchParams.get('status');
    const notes = body?.notes;
    
    // Also check body for appointmentId if not in query
    const finalAppointmentId = appointmentId || body?.appointmentId || body?.appointment_id;
    // Use authenticated doctor's ID instead of trusting query/body
    const finalDoctorId = user.id;

    console.log('📋 [Doctor Update Appointment Status] Updating appointment:', {
      appointmentId: finalAppointmentId,
      doctorId: finalDoctorId,
      status
    });

    if (!finalAppointmentId) {
      return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
    }

    if (!status || !['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'].includes(status)) {
      return NextResponse.json({ 
        error: 'Valid status required (scheduled, confirmed, completed, cancelled, no_show)' 
      }, { status: 400 });
    }

    // Verify appointment exists and belongs to doctor
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, doctor_id, status')
      .eq('id', finalAppointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('❌ [Doctor Update Appointment Status] Appointment not found:', fetchError);
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.doctor_id !== finalDoctorId) {
      console.error('❌ [Doctor Update Appointment Status] Access denied - doctor_id mismatch');
      return NextResponse.json({ error: 'Forbidden - You can only update your own appointments' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    console.log('💾 [Doctor Update Appointment Status] Updating appointment with data:', updateData);

    // Update appointment
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', finalAppointmentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ [Doctor Update Appointment Status] Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update appointment status',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ [Doctor Update Appointment Status] Appointment updated successfully:', updated.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Appointment status updated successfully', 
      appointment: updated 
    });

  } catch (error: any) {
    console.error('❌ [Doctor Update Appointment Status] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

