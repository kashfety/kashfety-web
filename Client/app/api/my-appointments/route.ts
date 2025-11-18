import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('📋 [My Appointments API] Request received');

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = searchParams.get('role') || 'patient';

    console.log('📋 [My Appointments API] User ID:', userId, 'Role:', role);

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'User ID is required as query parameter'
      }, { status: 400 });
    }

    // Build query
    let appointmentsQuery = supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctor:users!fk_appointments_doctor (id, name, first_name, last_name, first_name_ar, last_name_ar, name_ar, specialty, phone),
        patient:users!fk_appointments_patient (id, name, phone, email),
        center:centers!fk_appointments_center (id, name, name_ar, address, phone, email)
      `);

    // Filter by role
    if (role === 'super_admin' || role === 'admin') {
      console.log('📋 Admin - fetching all');
    } else if (role === 'doctor') {
      appointmentsQuery = appointmentsQuery.eq('doctor_id', userId);
    } else {
      appointmentsQuery = appointmentsQuery.eq('patient_id', userId);
    }

    const { data: appointments, error } = await appointmentsQuery
      .order('created_at', { ascending: false });

    if (error) {
      console.error('📋 Error:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch appointments',
        error: error.message
      }, { status: 500 });
    }

    console.log(`📋 Found ${appointments?.length || 0} appointments`);

    // Fetch all specialties for translation lookup
    const { data: specialties } = await supabaseAdmin
      .from('specialties')
      .select('name, name_en, name_ar, name_ku')
      .eq('is_active', true);

    // Create specialty lookup map (case-insensitive)
    const specialtyMap = new Map();
    (specialties || []).forEach((spec: any) => {
      if (spec.name) specialtyMap.set(spec.name.toLowerCase(), spec);
      if (spec.name_en) specialtyMap.set(spec.name_en.toLowerCase(), spec);
    });

    // Enrich
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
      if (apt.center) {
        apt.center_name = apt.center.name;
        apt.center_address = apt.center.address;
      }

      // Enrich doctor with specialty translations
      if (apt.doctor && apt.doctor.specialty) {
        const specialtyData = specialtyMap.get(apt.doctor.specialty.toLowerCase());
        if (specialtyData) {
          apt.doctor.specialty_ar = specialtyData.name_ar;
          apt.doctor.specialty_ku = specialtyData.name_ku;
          apt.doctor.specialty_en = specialtyData.name_en || apt.doctor.specialty;
        }
      }

      enriched.push(apt);
    }

    return NextResponse.json({ success: true, appointments: enriched });
  } catch (err: any) {
    console.error('📋 Error:', err);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: err.message
    }, { status: 500 });
  }
}

