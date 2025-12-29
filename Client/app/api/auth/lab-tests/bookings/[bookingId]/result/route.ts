import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await params;
    const { result_notes, result_file_url } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (result_notes !== undefined) updateData.result_notes = result_notes;
    if (result_file_url !== undefined) updateData.result_file_url = result_file_url;
    
    // Always update the result date when updating results
    updateData.result_date = new Date().toISOString().split('T')[0];
    updateData.status = 'completed';

    const { data, error } = await supabase
      .from('lab_bookings')
      .update(updateData)
      .eq('id', bookingId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update lab result' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lab result updated successfully',
      booking: data
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
