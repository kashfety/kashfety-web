import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get patient's lab booking history
    const { data: labHistory, error } = await supabase
      .from('lab_bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        notes,
        fee,
        created_at,
        lab_test_types(name, category),
        centers(name, address)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch lab history:', error);
      return NextResponse.json({ error: 'Failed to fetch lab history' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      labHistory: labHistory || []
    });

  } catch (error) {
    console.error('Lab history API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
