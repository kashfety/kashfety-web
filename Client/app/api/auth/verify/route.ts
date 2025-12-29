import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];

    // First, try to decode the token without verification to see what's in it
    const decodedWithoutVerify = jwt.decode(token, { complete: true });
    :', decodedWithoutVerify ? 'Valid JWT structure' : 'Invalid JWT structure');

    if (decodedWithoutVerify && typeof decodedWithoutVerify === 'object' && 'payload' in decodedWithoutVerify) {
    }

    // Verify JWT token - strict verification with issuer check (no fallback)
    let decoded: any;
    try {
      // Verify with issuer check (matching login route)
      decoded = jwt.verify(token, jwtSecret, {
        issuer: 'doctor-appointment-system'
      });
    } catch (error) {
      // Token verification failed - reject the request (no fallback)
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired token',
          error: 'Token signature verification failed'
        },
        { status: 401 }
      );
    }

    // Extract user ID from decoded token
    const userId = decoded.id || decoded.userId || decoded.uid;
    );

    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Token does not contain user ID' },
        { status: 401 }
      );
    }

    // Fetch fresh user data from database
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email, phone, role, center_id, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, message: 'Failed to fetch user data', error: error.message },
        { status: 500 }
      );
    }

    if (!userData) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }


    return NextResponse.json({
      success: true,
      message: 'Token is valid',
      user: userData
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

