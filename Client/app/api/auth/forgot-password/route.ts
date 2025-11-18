import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const expiresAt = new Date(Date.now() + (60 * 60 * 1000)); // 1 hour from now

    // Store token in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_token: token,
        reset_token_expiry: expiresAt.toISOString()
      })
      .eq('email', email);

    if (updateError) {
      console.error('❌ [Forgot-Password] Error storing token:', updateError);
      throw new Error('Failed to generate reset token');
    }

    console.log('✅ [Forgot-Password] Reset token generated for:', email);

    // Send password reset email using Supabase Auth
    // The email template in Supabase Dashboard should contain:
    // {{ .SiteURL }}/update-password?token_hash={{ .TokenHash }}&type=recovery
    try {
      const { error: emailError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/update-password`
      });

      if (emailError) {
        console.error('❌ [Forgot-Password] Error sending email:', emailError);
        // Don't throw - we still want to return success to prevent email enumeration
      } else {
        console.log('✅ [Forgot-Password] Email sent successfully to:', email);
      }
    } catch (emailException: any) {
      console.error('❌ [Forgot-Password] Exception sending email:', emailException);
      // Continue anyway to prevent email enumeration
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset link has been sent to your email.'
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

    // Check token in database
    const { data: user, error } = await supabase
      .from('users')
      .select('email, reset_token_expiry')
      .eq('reset_token', token)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(user.reset_token_expiry) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Token has expired' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: user.email
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

    // Clear the reset token from database
    if (token) {
      await supabase
        .from('users')
        .update({ reset_token: null, reset_token_expiry: null })
        .eq('reset_token', token);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true }); // Always return success for DELETE
  }
}
