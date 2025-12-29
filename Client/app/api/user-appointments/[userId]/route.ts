import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { userId } = await context.params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || authenticatedUser.role;

    // Verify userId matches authenticated user (unless admin)
    if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      if (!userId || userId !== authenticatedUser.id) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden - You can only access your own appointments'
        }, { status: 403 });
      }
    }


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
    } else if (role === 'doctor') {
      appointmentsQuery = appointmentsQuery.eq('doctor_id', userId);
    } else {
      appointmentsQuery = appointmentsQuery.eq('patient_id', userId);
    }

    const { data: appointments, error } = await appointmentsQuery
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, message: 'Failed to fetch appointments', error: error.message }, { status: 500 });
    }


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
    return NextResponse.json({ success: false, message: 'Internal server error', error: err.message }, { status: 500 });
  }
}

