import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requirePatient } from '@/lib/api-auth-utils';

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_ROLE_KEY. Set SUPABASE_SERVICE_ROLE_KEY in your environment.'
  );
}
if (!supabaseUrl) {
  throw new Error(
    'Missing Supabase URL. Set SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL in your environment.'
  );
}

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

const MAX_STRING_LENGTH = 255;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[\d\s+\-().]{7,30}$/;
const ALLOWED_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'] as const;

type AllowedField = (typeof ALLOWED_UPDATE_FIELDS)[number];

function validateField(
  field: AllowedField,
  value: unknown
): { valid: true; value: string } | { valid: false; message: string } {
  if (value === null || value === undefined) {
    return { valid: false, message: `${field} cannot be null or undefined` };
  }

  switch (field) {
    case 'email': {
      const s = String(value).trim();
      if (s.length > MAX_STRING_LENGTH) {
        return { valid: false, message: `email must be at most ${MAX_STRING_LENGTH} characters` };
      }
      if (!EMAIL_REGEX.test(s)) {
        return { valid: false, message: 'Invalid email format' };
      }
      return { valid: true, value: s };
    }
    case 'date_of_birth': {
      const s = String(value).trim();
      if (!DATE_YYYY_MM_DD_REGEX.test(s)) {
        return { valid: false, message: 'date_of_birth must be in YYYY-MM-DD format' };
      }
      const date = new Date(s);
      if (Number.isNaN(date.getTime())) {
        return { valid: false, message: 'Invalid date_of_birth' };
      }
      const [y, m, d] = s.split('-').map(Number);
      if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
        return { valid: false, message: 'Invalid date_of_birth' };
      }
      return { valid: true, value: s };
    }
    case 'phone': {
      const s = String(value).trim();
      if (s.length > MAX_STRING_LENGTH) {
        return { valid: false, message: `phone must be at most ${MAX_STRING_LENGTH} characters` };
      }
      if (!PHONE_REGEX.test(s)) {
        return { valid: false, message: 'Invalid phone format; use digits, spaces, +, -, ., or parentheses' };
      }
      return { valid: true, value: s };
    }
    case 'gender': {
      const s = String(value).trim().toLowerCase();
      if (!ALLOWED_GENDERS.includes(s as (typeof ALLOWED_GENDERS)[number])) {
        return {
          valid: false,
          message: `gender must be one of: ${ALLOWED_GENDERS.join(', ')}`,
        };
      }
      return { valid: true, value: s };
    }
    default: {
      // string fields: name, name_ar, first_name, last_name, first_name_ar, last_name_ar
      const s = String(value).trim();
      if (s.length > MAX_STRING_LENGTH) {
        return { valid: false, message: `${field} must be at most ${MAX_STRING_LENGTH} characters` };
      }
      return { valid: true, value: s };
    }
  }
}

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
      const isNotFound =
        (error as { code?: string; message?: string }).code === 'PGRST116' ||
        (typeof (error as { message?: string }).message === 'string' &&
          (error as { message?: string }).message?.toLowerCase().includes('0 rows'));
      if (isNotFound) {
        return NextResponse.json(
          { success: false, message: 'Patient profile not found' },
          { status: 404 }
        );
      }
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
      if (body[field] === undefined) continue;
      const result = validateField(field, body[field]);
      if (!result.valid) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }
      updates[field] = result.value;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, message: 'No allowed fields to update' },
        { status: 400 }
      );
    }

    updates.updated_at = new Date().toISOString();

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
