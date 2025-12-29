import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patientId') || authenticatedUser.id;

    // Verify patientId matches authenticated user (unless admin)
    if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      if (patientId !== authenticatedUser.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only access your own lab bookings'
        }, { status: 403 });
      }
    }

    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }


    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get lab bookings for this patient with related data
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        *,
        patient:users!lab_bookings_patient_id_fkey(id, name, first_name, last_name, first_name_ar, last_name_ar, name_ar, phone, email),
        center:centers(id, name, name_ar, address, phone, email),
        lab_test_type:lab_test_types(id, name, name_ar, name_ku, description, category, default_fee)
      `)
      .eq('patient_id', patientId)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: false });

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch lab bookings',
        details: error.message 
      }, { status: 500 });
    }


    // Enrich bookings with proper field names for frontend
    const enrichedBookings = (bookings || []).map(booking => ({
      ...booking,
      type: booking.lab_test_type,
      center_name: booking.center?.name,
      center_address: booking.center?.address
    }));

    return NextResponse.json({
      success: true,
      bookings: enrichedBookings
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

