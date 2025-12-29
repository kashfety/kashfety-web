import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🔬 [Center Patient Lab History] Request received');
    
    // Require center authentication
    const authResult = requireCenter(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId');
    const centerId = searchParams.get('center_id') || user.center_id;

    if (!patientId) {
      return NextResponse.json({ success: false, error: 'Patient ID is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify center has access to this patient (patient must have bookings at this center)
    if (centerId) {
      const { data: booking, error: bookingError } = await supabase
        .from('lab_bookings')
        .select('id')
        .eq('patient_id', patientId)
        .eq('center_id', centerId)
        .limit(1)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only access lab history for patients who have bookings at your center'
        }, { status: 403 });
      }
    }

    // Build query
    let query = supabase
      .from('lab_bookings')
      .select(`
        id,
        booking_date,
        booking_time,
        status,
        duration,
        notes,
        fee,
        result_file_url,
        result_notes,
        result_date,
        created_at,
        updated_at,
        center:centers!center_id(id, name, address, phone),
        test_type:lab_test_types!lab_test_type_id(id, name, category, description, default_duration)
      `)
      .eq('patient_id', patientId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    // Filter by center (required for access control)
    if (centerId) {
      query = query.eq('center_id', centerId);
    }

    const { data: labHistory, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch lab history:', error);
      return NextResponse.json({ success: false, error: 'Failed to fetch lab history', details: error.message }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedHistory = (labHistory || []).map((booking: any) => ({
      id: booking.id,
      booking_date: booking.booking_date,
      booking_time: booking.booking_time,
      status: booking.status,
      duration: booking.duration,
      notes: booking.notes,
      fee: booking.fee,
      result_file_url: booking.result_file_url,
      result_notes: booking.result_notes,
      result_date: booking.result_date,
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      center: booking.center,
      test_type: booking.test_type
    }));

    console.log('✅ [Center Patient Lab History] Fetched', transformedHistory.length, 'bookings for patient:', patientId);
    return NextResponse.json({ success: true, bookings: transformedHistory });

  } catch (error: any) {
    console.error('❌ Center patient lab history API error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error', details: error.message }, { status: 500 });
  }
}

