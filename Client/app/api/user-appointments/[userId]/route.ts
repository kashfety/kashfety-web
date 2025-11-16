import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    console.log('📋 [User Appointments API] Request received');
    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'patient';

    console.log('📋 [User Appointments API] User ID:', userId, 'Role:', role);

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    // Build query based on role
    let appointmentsQuery = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:users!fk_appointments_doctor (id, name, specialty, phone),
        patient:users!fk_appointments_patient (id, name, phone, email),
        center:centers!fk_appointments_center (id, name, address, phone, email)
      `);

    // Filter by role
    if (role === 'super_admin' || role === 'admin') {
      console.log('Admin/Super Admin - fetching all appointments');
    } else if (role === 'doctor') {
      appointmentsQuery = appointmentsQuery.eq('doctor_id', userId);
    } else {
      appointmentsQuery = appointmentsQuery.eq('patient_id', userId);
    }

    const { data: appointments, error } = await appointmentsQuery
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      console.error('Error fetching appointments:', error);
      return NextResponse.json({ success: false, message: 'Failed to fetch appointments', error: error.message }, { status: 500 });
    }

    console.log(`Found ${appointments?.length || 0} appointments`);

    // Enrich with center info
    const enriched = [] as any[];
    for (const apt of appointments || []) {
      if (!apt.center && apt.center_id) {
        const { data: center } = await supabaseAdmin
          .from('centers')
          .select('id, name, address, phone, email')
          .eq('id', apt.center_id)
          .single();
        if (center) apt.center = center;
      }
      if (apt.center) {
        apt.center_name = apt.center.name;
        apt.center_address = apt.center.address;
      }
      enriched.push(apt);
    }

    return NextResponse.json({ success: true, appointments: enriched });
  } catch (err: any) {
    console.error('Error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error', error: err.message }, { status: 500 });
  }
}

