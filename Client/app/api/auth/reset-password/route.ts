import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenHash, newPassword } = body;

    console.log('📥 [Reset-Password] Request received with token hash');

    // Validate required fields
    if (!tokenHash || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Token and new password are required' },
        { status: 400 }
      );
    }

    // Validate password length
    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Verify the token and get the user session using Supabase Auth
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery'
    });

    if (verifyError || !verifyData.user) {
      console.error('❌ [Reset-Password] Invalid or expired token:', verifyError);
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    const userEmail = verifyData.user.email;
    console.log('✅ [Reset-Password] Token verified for user:', userEmail);

    // Hash new password for our custom users table
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(newPassword, saltRounds);

    console.log('🔐 [Reset-Password] Password hashed, updating database...');

    // Update password in our custom users table
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        password_hash,
        reset_token: null,
        reset_token_expiry: null,
        updated_at: new Date().toISOString()
      })
      .eq('email', userEmail);

    if (updateError) {
      console.error('❌ [Reset-Password] Error updating password in users table:', updateError);
    }

    // Also update the password in Supabase Auth for consistency
    const { error: authUpdateError } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (authUpdateError) {
      console.error('❌ [Reset-Password] Error updating Supabase Auth password:', authUpdateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update password' },
        { status: 500 }
      );
    }

    console.log('✅ [Reset-Password] Password updated successfully for:', userEmail);

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error: any) {
    console.error('❌ [Reset-Password] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
