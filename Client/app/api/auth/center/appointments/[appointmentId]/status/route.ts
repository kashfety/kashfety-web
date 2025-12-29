import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromAuth } from '../../../utils/jwt-auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
) {
  try {
    // Authenticate user
    const user = await getUserFromAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is center role
    if (user.role !== 'center') {
      return NextResponse.json({ error: 'Access denied. Center role required.' }, { status: 403 });
    }

    const { appointmentId } = await params;
    const { status } = await request.json();

    if (!appointmentId || !status) {
      return NextResponse.json({ error: 'Appointment ID and status are required' }, { status: 400 });
    }

    // Update appointment status in lab_bookings table
    const { data, error } = await supabase
      .from('lab_bookings')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('center_id', user.center_id) // Ensure user can only update appointments for their center
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update appointment status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Appointment not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `Appointment ${status} successfully`,
      appointment: data
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
