import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> | { appointmentId: string } }
) {
  try {
    
    // Require doctor authentication
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;
    
    const body = await request.json();
    // Handle both Promise and synchronous params (Next.js 14 vs 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { appointmentId } = resolvedParams;
    
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId param is required' }, { status: 400 });
    }


    // Use authenticated doctor's ID instead of trusting query/body
    const doctorId = user.id;
    const status = body?.status;
    const notes = body?.notes;

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
      return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
    }

    if (appointment.doctor_id !== doctorId) {
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


    // Update appointment
    const { data: updated, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ 
        error: 'Failed to update appointment status',
        details: updateError.message 
      }, { status: 500 });
    }


    return NextResponse.json({ 
      success: true, 
      message: 'Appointment status updated successfully', 
      appointment: updated 
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
