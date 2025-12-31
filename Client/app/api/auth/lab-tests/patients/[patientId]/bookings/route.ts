import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Verify patientId matches authenticated user (unless admin)
    // Patients can only access their own bookings
    if (authenticatedUser.role === 'patient') {
      if (patientId !== authenticatedUser.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only access your own lab bookings'
        }, { status: 403 });
      }
    } else if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      // Other roles (doctors, centers) cannot access patient lab bookings
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Only patients and admins can access lab bookings'
      }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get patient's lab bookings with center and test type details
    const { data: bookings, error } = await supabase
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
        centers:center_id(
          id,
          name,
          address,
          phone
        ),
        lab_test_types:lab_test_type_id(
          id,
          name,
          category,
          description,
          default_duration
        )
      `)
      .eq('patient_id', patientId)
      .order('booking_date', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedBookings = bookings?.map((booking: any) => ({
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
      center: booking.centers ? {
        id: booking.centers.id,
        name: booking.centers.name,
        address: booking.centers.address,
        phone: booking.centers.phone
      } : null,
      type: booking.lab_test_types ? {
        id: booking.lab_test_types.id,
        name: booking.lab_test_types.name,
        category: booking.lab_test_types.category,
        description: booking.lab_test_types.description,
        default_duration: booking.lab_test_types.default_duration
      } : null
    })) || [];

    return NextResponse.json({
      success: true,
      bookings: transformedBookings
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
