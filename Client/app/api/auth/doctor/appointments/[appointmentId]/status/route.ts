import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ appointmentId: string }> }
) {
  try {
    console.log('🔄 [Doctor Appointment Status] PUT request received');
    
    const body = await request.json();
    const { appointmentId } = await context.params;
    
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId param is required' }, { status: 400 });
    }

    console.log('📋 [Doctor Appointment Status] Updating appointment:', appointmentId, 'with body:', body);

    // Get doctor_id from query params or body
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctor_id') || body?.doctor_id;
    const status = body?.status;
    const notes = body?.notes;

    if (!doctorId) {
      return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
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
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('❌ [Doctor Appointment Status] Appointment not found:', fetchError);
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.doctor_id !== doctorId) {
      console.error('❌ [Doctor Appointment Status] Access denied - doctor_id mismatch');
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    console.log('💾 [Doctor Appointment Status] Updating appointment with data:', updateData);

    // Update appointment
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      console.error('❌ [Doctor Appointment Status] Update error:', updateError);
      return NextResponse.json({ 
        error: 'Failed to update appointment status',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ [Doctor Appointment Status] Appointment updated successfully:', updated.id);

    return NextResponse.json({ 
      success: true, 
      message: 'Appointment status updated successfully', 
      appointment: updated 
    });

  } catch (error: any) {
    console.error('❌ [Doctor Appointment Status] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
