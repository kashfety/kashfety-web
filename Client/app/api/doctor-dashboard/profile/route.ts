import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/profile`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
    } catch (e) {
      // continue fallback
    }
  }

  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  try {
    const doctorId = searchParams.get('doctor_id');
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email, phone, specialty, consultation_fee, home_visits_available, rating, bio')
      .eq('id', doctorId)
      .single();
    if (error) throw error;
    return NextResponse.json({ success: true, doctor: user });
  } catch (e: any) {
    console.error('profile fallback error:', e);
    return NextResponse.json({ error: e.message || 'Failed to load profile' }, { status: 500 });
  }
}
