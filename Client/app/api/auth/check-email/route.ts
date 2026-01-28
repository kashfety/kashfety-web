import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * POST /api/auth/check-email
 * Check if an email is already registered in the system.
 * This endpoint should be called before sending OTP to prevent
 * users from going through verification only to fail at registration.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', exists: false },
        { status: 400 }
      );
    }

    // Normalize email: trim and convert to lowercase
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email exists in users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // If there's a real database error (not just "no rows found"), handle it
    if (userCheckError && userCheckError.code !== 'PGRST116') {
      console.error('Error checking email:', userCheckError);
      return NextResponse.json(
        { error: 'Database error while checking email', exists: false },
        { status: 500 }
      );
    }

    if (existingUser) {
      return NextResponse.json({
        exists: true,
        message: 'This email is already registered'
      });
    }

    // Also check if email exists in centers table
    const { data: existingCenter, error: centerCheckError } = await supabase
      .from('centers')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // If there's a real database error (not just "no rows found"), handle it
    if (centerCheckError && centerCheckError.code !== 'PGRST116') {
      console.error('Error checking email in centers:', centerCheckError);
      return NextResponse.json(
        { error: 'Database error while checking email', exists: false },
        { status: 500 }
      );
    }

    if (existingCenter) {
      return NextResponse.json({
        exists: true,
        message: 'This email is already associated with a center'
      });
    }

    return NextResponse.json({
      exists: false,
      message: 'Email is available'
    });

  } catch (error: any) {
    console.error('Check email error:', error);
    return NextResponse.json(
      { error: 'Internal server error', exists: false },
      { status: 500 }
    );
  }
}
