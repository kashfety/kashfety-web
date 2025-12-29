import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    
    // Require admin authentication
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user: authenticatedUser } = authResult;

    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');

    if (!centerId) {
      return NextResponse.json({ success: false, error: 'Center ID is required' }, { status: 400 });
    }


    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch center details
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId)
      .single();

    if (centerError || !center) {
      return NextResponse.json({ success: false, error: 'Center not found', details: centerError?.message }, { status: 404 });
    }

    // Fetch center owner (if exists)
    let ownerInfo = null;
    if (center.owner_doctor_id) {
      const { data: owner } = await supabase
        .from('users')
        .select('id, name, email, phone, specialty')
        .eq('id', center.owner_doctor_id)
        .single();
      ownerInfo = owner;
    }

    // Fetch center user account (for password status - don't fetch password_hash)
    let centerUser = null;
    let passwordSet = false;
    if (center.email) {
      const { data: user } = await supabase
        .from('users')
        .select('id, password_hash, role, approval_status')
        .eq('email', center.email)
        .eq('role', 'center')
        .single();
      centerUser = user;
      passwordSet = !!user?.password_hash;
    }

    // Fetch statistics (doctors, appointments, ratings)
    const [doctorsResult, appointmentsResult] = await Promise.all([
      // Count doctors associated with this center
      supabase
        .from('doctor_center_assignments')
        .select('doctor_id', { count: 'exact', head: true })
        .eq('center_id', centerId),
      
      // Count appointments for this center
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('center_id', centerId)
    ]);

    const stats = {
      totalDoctors: doctorsResult.count || 0,
      totalAppointments: appointmentsResult.count || 0,
      averageRating: 0 // Could be calculated from reviews if available
    };

    // Transform center data
    const transformedCenter = {
      id: center.id,
      name: center.name,
      address: center.address,
      phone: center.phone,
      email: center.email,
      center_type: center.center_type || 'generic',
      approval_status: center.approval_status || 'pending',
      owner_doctor_id: center.owner_doctor_id,
      owner: ownerInfo,
      offers_labs: center.offers_labs || false,
      offers_imaging: center.offers_imaging || false,
      operating_hours: center.operating_hours,
      description: center.description,
      admin_notes: center.admin_notes,
      is_active: center.is_active !== false,
      created_at: center.created_at,
      updated_at: center.updated_at,
      password_set: passwordSet,
      stats
    };


    return NextResponse.json({
      success: true,
      data: transformedCenter
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

