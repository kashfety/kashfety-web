import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('center_id');
    const specialty = searchParams.get('specialty');
    const homeVisit = searchParams.get('home_visit') === 'true';

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Users table holds doctors per schema; optional join to doctor_centers for center filter
    let baseQuery = supabase
      .from('users')
      .select('id, name, first_name, last_name, specialty, consultation_fee, profile_picture_url, home_visits_available, rating, experience_years')
      .eq('role', 'doctor');

    if (specialty) {
      baseQuery = baseQuery.ilike('specialty', `%${specialty}%`);
    }

    // Filter for home visits if requested
    if (homeVisit) {
      baseQuery = baseQuery.eq('home_visits_available', true);
    }

    const { data: doctors, error } = await baseQuery;
    if (error) throw error;

    // If center scoped, filter using doctor_centers relation
    let result = doctors || [];
    if (centerId) {
      // If centerId is provided, restrict to doctors assigned to that center
      const { data: links } = await supabase
        .from('doctor_centers')
        .select('doctor_id')
        .eq('center_id', centerId);
      const allowed = new Set((links || []).map((l: any) => l.doctor_id));
      result = result.filter((d: any) => allowed.has(d.id));
    }

    return NextResponse.json({ success: true, doctors: result });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch doctors' }, { status: 500 });
  }
}
