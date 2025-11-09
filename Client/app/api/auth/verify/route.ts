import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 [Verify API] Request received');
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('🔐 [Verify API] No authorization header or invalid format');
      return NextResponse.json(
        { success: false, message: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    console.log('🔐 [Verify API] Token extracted, length:', token?.length);

    // Verify JWT token (matching login route configuration)
    let decoded: any;
    let verificationError: any = null;
    
    try {
      // First try with issuer check (matching login route)
      decoded = jwt.verify(token, jwtSecret, {
        issuer: 'doctor-appointment-system'
      });
      console.log('🔐 [Verify API] Token verified with issuer check');
    } catch (error) {
      verificationError = error;
      console.error('🔐 [Verify API] JWT verification with issuer failed:', error);
      // Try without issuer check for backward compatibility
      try {
        decoded = jwt.verify(token, jwtSecret);
        console.log('🔐 [Verify API] Token verified without issuer check');
      } catch (fallbackError) {
        console.error('🔐 [Verify API] JWT verification without issuer also failed:', fallbackError);
        // Try decoding without verification to see what's in the token
        try {
          const decodedWithoutVerify = jwt.decode(token);
          console.log('🔐 [Verify API] Token decoded (not verified):', decodedWithoutVerify);
        } catch (decodeError) {
          console.error('🔐 [Verify API] Token cannot even be decoded:', decodeError);
        }
        
        return NextResponse.json(
          { 
            success: false, 
            message: 'Invalid or expired token',
            error: verificationError?.message || fallbackError?.message || 'Token verification failed'
          },
          { status: 401 }
        );
      }
    }

    // Extract user ID from decoded token
    const userId = decoded.id || decoded.userId || decoded.uid;
    console.log('🔐 [Verify API] Decoded token user ID:', userId);
    console.log('🔐 [Verify API] Full decoded token:', JSON.stringify(decoded, null, 2));

    if (!userId) {
      console.error('🔐 [Verify API] No user ID found in token');
      return NextResponse.json(
        { success: false, message: 'Token does not contain user ID' },
        { status: 401 }
      );
    }

    // Fetch fresh user data from database
    const { data: userData, error } = await supabaseAdmin
      .from('users')
      .select('id, name, first_name, last_name, email, phone, role, center_id, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('🔐 [Verify API] Error fetching user data:', error);
      return NextResponse.json(
        { success: false, message: 'Failed to fetch user data', error: error.message },
        { status: 500 }
      );
    }

    if (!userData) {
      console.error('🔐 [Verify API] User not found in database for ID:', userId);
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    console.log('✅ [Verify API] Token verified, returning fresh user data:', userData);

    return NextResponse.json({
      success: true,
      message: 'Token is valid',
      user: userData
    });
  } catch (error: any) {
    console.error('Error in verify endpoint:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error', error: error.message },
      { status: 500 }
    );
  }
}

