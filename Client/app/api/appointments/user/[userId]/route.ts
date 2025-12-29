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
    console.log('📋 [Appointments API - Alternative Route] Request received');
    
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    // Await params in Next.js App Router
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

    console.log('📋 [Appointments API] User ID:', userId, 'Role:', role);

    if (!userId) {
      console.error('📋 [Appointments API] Missing user ID');
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    // Handle different roles - super_admin can see all appointments, others see their own
    let appointmentsQuery = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:users!fk_appointments_doctor (id, name, first_name, last_name, first_name_ar, last_name_ar, name_ar, specialty, phone),
        patient:users!fk_appointments_patient (id, name, first_name, last_name, first_name_ar, last_name_ar, name_ar, phone, email),
        center:centers!fk_appointments_center (id, name, name_ar, address, phone, email)
      `);

    // Filter by role - super_admin sees all, others see their own
    if (role === 'super_admin' || role === 'admin') {
      // Super admin and admin can see all appointments - no filter
      console.log('📋 [Appointments API] Admin/Super Admin - fetching all appointments');
    } else if (role === 'doctor') {
      appointmentsQuery = appointmentsQuery.eq('doctor_id', userId);
      console.log('📋 [Appointments API] Doctor - fetching appointments for doctor:', userId);
    } else {
      // Default to patient
      appointmentsQuery = appointmentsQuery.eq('patient_id', userId);
      console.log('📋 [Appointments API] Patient - fetching appointments for patient:', userId);
    }

    const { data: appointments, error } = await appointmentsQuery
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📋 [Appointments API] Error:', error);
      return NextResponse.json({ success: false, message: 'Failed to fetch appointments', error: error.message }, { status: 500 });
    }

    console.log(`📋 [Appointments API] Found ${appointments?.length || 0} appointments`);

    // Debug and enrich missing center info
    const enriched = [] as any[];
    for (const apt of appointments || []) {
      if (!apt.center && apt.center_id) {
        const { data: center } = await supabaseAdmin
          .from('centers')
          .select('id, name, name_ar, address, phone, email')
          .eq('id', apt.center_id)
          .single();
        if (center) apt.center = center;
      }
      // convenience flat fields
      if (apt.center) {
        apt.center_name = apt.center.name;
        apt.center_address = apt.center.address;
      }
      enriched.push(apt);
    }

    return NextResponse.json({ success: true, appointments: enriched });
  } catch (err: any) {
    console.error('📋 [Appointments API] Error:', err);
    return NextResponse.json({ success: false, message: 'Internal server error', error: err.message }, { status: 500 });
  }
}

