import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_FALLBACK_ENABLED = process.env.AUTH_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify JWT token and require doctor role
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    const { user } = authResult;
    
    // SECURITY: Use authenticated doctor's ID
    const doctorId = user.id;
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    if (authHeader) {
      try {
        const url = new URL(`${BACKEND_URL}/api/auth/doctor/profile`);
        url.searchParams.set('doctor_id', doctorId);
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        // If backend rejects, fall through to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // Continue to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) {
          return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
        }
      }
    }

    // Supabase fallback

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, name_ar, email, phone, specialty, bio, experience_years, consultation_fee, qualifications')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();
    if (error) throw error;

    // Fetch Arabic specialty name if specialty exists
    if (user && user.specialty) {
      const { data: specialtyData } = await supabase
        .from('specialties')
        .select('name_ar')
        .or(`name.eq.${user.specialty},name_en.eq.${user.specialty}`)
        .single();

      if (specialtyData) {
        (user as any).specialty_ar = specialtyData.name_ar;
      }
    }

    return NextResponse.json({ success: true, doctor: user });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // SECURITY: Verify JWT token and require doctor role
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    const { user } = authResult;
    
    // SECURITY: Use authenticated doctor's ID
    const doctorId = user.id;
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));

    if (authHeader) {
      try {
        const url = new URL(`${BACKEND_URL}/api/auth/doctor/profile`);
        url.searchParams.set('doctor_id', doctorId);
        const response = await fetch(url.toString(), {
          method: 'PUT',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ...body, doctor_id: doctorId }),
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        // If backend rejects, fall through to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) return NextResponse.json(data, { status: response.status });
      } catch (e) {
        if (!AUTH_FALLBACK_ENABLED) {
          return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
        }
      }
    }

    // Supabase fallback

    const allowedFields = ['name', 'name_ar', 'specialty', 'bio', 'experience_years', 'consultation_fee', 'qualifications'];
    const updates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in body) updates[key] = body[key];
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: updated, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .select('id, name, name_ar, email, phone, specialty, bio, experience_years, consultation_fee, qualifications')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ success: true, doctor: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}
