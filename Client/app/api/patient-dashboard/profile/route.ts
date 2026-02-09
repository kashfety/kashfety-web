import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requirePatient } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export const dynamic = 'force-dynamic';

const ALLOWED_UPDATE_FIELDS = [
  'name',
  'name_ar',
  'first_name',
  'last_name',
  'first_name_ar',
  'last_name_ar',
  'email',
  'phone',
  'gender',
  'date_of_birth',
] as const;

// GET: Fetch patient profile
export async function GET(req: NextRequest) {
  try {
    const authResult = requirePatient(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select(
        'id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, date_of_birth, profile_picture_url, emergency_contact, created_at'
      )
      .eq('id', user.id)
      .eq('role', 'patient')
      .single();

    if (error) {
      throw error;
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, message: 'Patient profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        name_ar: profile.name_ar,
        first_name: profile.first_name,
        last_name: profile.last_name,
        first_name_ar: profile.first_name_ar,
        last_name_ar: profile.last_name_ar,
        email: profile.email ?? '',
        phone: profile.phone ?? '',
        gender: profile.gender ?? '',
        date_of_birth: profile.date_of_birth ?? '',
        profile_picture_url: profile.profile_picture_url ?? null,
        emergency_contact: profile.emergency_contact ?? {},
        created_at: profile.created_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// PUT: Update patient profile
export async function PUT(req: NextRequest) {
  try {
    const authResult = requirePatient(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }
    const { user } = authResult;

    const body = await req.json();
    const updates: Record<string, unknown> = {};

    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No allowed fields to update' },
        { status: 400 }
      );
    }

    (updates as Record<string, unknown>).updated_at = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .eq('role', 'patient')
      .select('id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email, phone, gender, date_of_birth, profile_picture_url, updated_at')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: data,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
