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
    
    // Fetch doctor profile with Arabic name fields
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, name_ar, first_name, first_name_ar, last_name, last_name_ar, email, phone, specialty, consultation_fee, home_visits_available, rating, bio')
      .eq('id', doctorId)
      .single();
    
    if (error) throw error;
    
    console.log('🔍 Doctor data from Supabase:', {
      name: user?.name,
      name_ar: user?.name_ar,
      first_name_ar: user?.first_name_ar,
      last_name_ar: user?.last_name_ar,
      specialty: user?.specialty
    });
    
    // If doctor has specialty, fetch Arabic specialty name from specialties table
    if (user?.specialty) {
      const { data: specialtyData } = await supabase
        .from('specialties')
        .select('name, name_ar, name_en, name_ku')
        .eq('name', user.specialty)
        .single();
      
      
      if (specialtyData) {
        user.specialty_name_ar = specialtyData.name_ar;
        user.specialty_name_en = specialtyData.name_en;
        user.specialty_name_ku = specialtyData.name_ku;
      }
    }
    
    return NextResponse.json({ success: true, doctor: user });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to load profile' }, { status: 500 });
  }
}
