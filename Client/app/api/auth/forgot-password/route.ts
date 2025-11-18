import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// In-memory store for reset tokens (in production, use Redis or database)
const resetTokens = new Map<string, { email: string; expiresAt: number }>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log('📥 [Forgot-Password] Request received for email:', email);

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single();

    // Always return success to prevent email enumeration
    if (userError || !user) {
      console.log('⚠️ [Forgot-Password] User not found, but returning success');
      return NextResponse.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate secure reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour from now

    // Store token
    resetTokens.set(token, { email: user.email, expiresAt });

    // Clean up expired tokens
    for (const [key, value] of resetTokens.entries()) {
      if (value.expiresAt < Date.now()) {
        resetTokens.delete(key);
      }
    }

    console.log('✅ [Forgot-Password] Reset token generated for:', email);

    // In production, send email here
    // For now, we'll just return the token in the response (NOT SECURE, for development only)
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/update-password?token=${token}`;
    
    console.log('🔗 [Forgot-Password] Reset URL:', resetUrl);

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email.',
      // Remove this in production - only for development
      resetUrl: process.env.NODE_ENV === 'development' ? resetUrl : undefined
    });

  } catch (error: any) {
    console.error('❌ [Forgot-Password] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint to verify token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const tokenData = resetTokens.get(token);

    if (!tokenData) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    if (tokenData.expiresAt < Date.now()) {
      resetTokens.delete(token);
      return NextResponse.json(
        { success: false, error: 'Token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: tokenData.email
    });

  } catch (error: any) {
    console.error('❌ [Forgot-Password] Token verification error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Endpoint to consume/delete token after use
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (token) {
      resetTokens.delete(token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true }); // Always return success for DELETE
  }
}
