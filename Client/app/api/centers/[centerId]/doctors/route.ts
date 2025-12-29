import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Get doctors by center (optionally filter by specialty). Tries backend first; falls back to Supabase.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    // Await params to get the centerId first
    const { centerId } = await params;

    const { searchParams } = new URL(request.url);
    const specialty = searchParams.get('specialty') || undefined;
    const homeVisit = searchParams.get('home_visit') || undefined;
    const authHeader = request.headers.get('authorization') || undefined;

    // Attempt backend (if available)
    try {
      const qs = new URLSearchParams();
      if (specialty) qs.set('specialty', specialty);
      if (homeVisit) qs.set('home_visit', homeVisit);

      const url = `${BACKEND_URL}/api/auth/centers/${centerId}/doctors${qs.toString() ? `?${qs.toString()}` : ''}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: authHeader ? { Authorization: authHeader } : undefined,
      });
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      }
      // If unauthorized or server error, fall through to Supabase fallback
    } catch (e) {
      // Ignore and try fallback
    }

    // Supabase fallback (server-side; safe to use service role)
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
      return NextResponse.json({ success: false, message: 'Failed to fetch center doctors' }, { status: 500 });
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

    if (specialty) {
      const s = specialty.toLowerCase();
      doctors = doctors.filter(d => (d.specialty || '').toLowerCase().includes(s));
    }
    if (homeVisit === 'true') {
      doctors = doctors.filter(d => d.home_available === true);
    }

    return NextResponse.json({ success: true, doctors }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Failed to fetch center doctors' }, { status: 500 });
  }
}
