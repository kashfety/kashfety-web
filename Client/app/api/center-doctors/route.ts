import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');
    const specialty = searchParams.get('specialty') || undefined;
    const homeVisit = searchParams.get('home_visit') || undefined;

    console.log('🏥 [Center Doctors API] Request - Center:', centerId, 'Specialty:', specialty);

    if (!centerId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Center ID is required as query parameter' 
      }, { status: 400 });
    }

    // Query Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('doctor_centers')
      .select(`
        doctor_id,
        users:users!fk_doctor_centers_doctor (
          id, name, specialty, consultation_fee, home_visits_available, rating, experience_years, profile_picture
        )
      `)
      .eq('center_id', centerId);

    if (error) {
      console.error('🏥 Error fetching doctors:', error);
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch center doctors' 
      }, { status: 500 });
    }

    let doctors = (data || [])
      .map((row: any) => Array.isArray(row.users) ? row.users[0] : row.users)
      .filter(Boolean)
      .map((u: any) => ({
        id: u.id,
        name: u.name,
        specialty: u.specialty,
        consultation_fee: Number(u.consultation_fee || 0),
        home_available: !!u.home_visits_available,
        rating: typeof u.rating === 'number' ? u.rating : 0,
        experience_years: u.experience_years || 0,
        profile_picture: u.profile_picture || '/default-avatar.jpg'
      }));

    // Filter by specialty if provided
    if (specialty) {
      const s = specialty.toLowerCase();
      doctors = doctors.filter(d => (d.specialty || '').toLowerCase().includes(s));
    }

    // Filter by home visit if requested
    if (homeVisit === 'true') {
      doctors = doctors.filter(d => d.home_available === true);
    }

    console.log(`🏥 Found ${doctors.length} doctors for center ${centerId}`);

    return NextResponse.json({ success: true, doctors }, { status: 200 });
  } catch (error: any) {
    console.error('🏥 Error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}

