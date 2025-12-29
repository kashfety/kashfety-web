import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// Alias proxy with fallback: /api/center-schedule/:centerId/doctors → backend, else Supabase
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ centerId: string }> }
) {
  const { searchParams } = new URL(request.url);
  const specialty = searchParams.get('specialty') || undefined;
  const homeVisit = searchParams.get('home_visit') || undefined;
  const authHeader = request.headers.get('authorization') || undefined;
  const { centerId } = await context.params;

  // Try backend first
  try {
    const qs = new URLSearchParams();
    if (specialty) qs.set('specialty', specialty);
    if (homeVisit) qs.set('home_visit', homeVisit);
  const url = `${BACKEND_URL}/api/auth/centers/${centerId}/doctors${qs.toString() ? `?${qs.toString()}` : ''}`;
    const response = await fetch(url, { method: 'GET', headers: authHeader ? { Authorization: authHeader } : undefined });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }
  } catch (e) {
    // ignore and try fallback
  }

  // Supabase fallback
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supabase
      .from('doctor_centers')
      .select(`
        doctor_id,
        users:users!fk_doctor_centers_doctor (
          id, name, specialty, consultation_fee, home_visits_available, rating
        )
      `)
  .eq('center_id', centerId);

    if (error) {
      :', error);
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
        rating: typeof u.rating === 'number' ? u.rating : 0
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
