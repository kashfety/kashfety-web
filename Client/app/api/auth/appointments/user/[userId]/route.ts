import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    console.log('📋 [Appointments API] Request received');
    // Await params in Next.js App Router
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'patient';

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
        doctor:users!fk_appointments_doctor (id, name, specialty, phone),
        patient:users!fk_appointments_patient (id, name, phone, email),
        center:centers!fk_appointments_center (id, name, address, phone, email)
      `);
    
    // Filter by role - super_admin sees all, others see their own
    if (role === 'super_admin' || role === 'admin') {
      // Super admin and admin can see all appointments - no filter
    } else if (role === 'doctor') {
      appointmentsQuery = appointmentsQuery.eq('doctor_id', userId);
    } else {
      // Default to patient
      appointmentsQuery = appointmentsQuery.eq('patient_id', userId);
    }
    
    const { data: appointments, error } = await appointmentsQuery
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, message: 'Failed to fetch appointments', error: error.message }, { status: 500 });
    }

    // Debug and enrich missing center info
    const enriched = [] as any[];
    for (const apt of appointments || []) {
      console.log('🔎 Appointment center debug (Next API):', { id: apt.id, center_id: apt.center_id, center: apt.center?.id });
      if (!apt.center && apt.center_id) {
        const { data: center } = await supabaseAdmin
          .from('centers')
          .select('id, name, address, phone, email')
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
    console.error('Error fetching appointments:', err);
    return NextResponse.json({ success: false, message: 'Internal server error', error: err.message }, { status: 500 });
  }
}
