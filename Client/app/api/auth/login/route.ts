import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate JWT token (matching Express implementation)
function generateToken(user: any): string {
  const payload = {
    id: user.id,
    uid: user.uid || user.id,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    center_id: user.center_id || null
  };
  
  return jwt.sign(payload, jwtSecret, { 
    expiresIn: '24h',
    issuer: 'doctor-appointment-system'
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Find user in database by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if doctor is approved (for doctors only)
    if (user.role === 'doctor' && user.approval_status !== 'approved') {
      let message = '';
      switch (user.approval_status) {
        case 'pending':
          message = 'Your account is pending admin approval. Please wait for certificate verification.';
          break;
        case 'rejected':
          message = 'Your account has been rejected. Please contact support for more information.';
          break;
        default:
          message = 'Your account is not approved. Please contact support.';
      }
      return NextResponse.json(
        {
          error: message,
          approval_status: user.approval_status,
          requires_approval: true
        },
        { status: 403 }
      );
    }

    // Remove sensitive fields and generate JWT token
    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(user);

    return NextResponse.json({
      message: 'Login successful',
      success: true,
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    });

  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}

