import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
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

    // For doctors, check certificate status
    let certificateStatus = null;
    let hasCertificate = false;
    
    if (user.role === 'doctor') {
      // Check if doctor has uploaded any certificates
      const { data: certificates } = await supabase
        .from('doctor_certificates')
        .select('id, status, certificate_file_url')
        .eq('doctor_id', user.id)
        .order('submitted_at', { ascending: false })
        .limit(1);

      if (certificates && certificates.length > 0) {
        const cert = certificates[0];
        // Check if it's a real certificate or just a placeholder from skipping
        if (cert.certificate_file_url) {
          hasCertificate = true;
          certificateStatus = cert.status;
        } else {
          // No file uploaded yet - doctor skipped during signup
          certificateStatus = 'not_uploaded';
        }
      } else {
        // No certificate record at all
        certificateStatus = 'not_uploaded';
      }

      // Block login if no certificate uploaded at all
      // But provide a temporary token for certificate upload
      if (certificateStatus === 'not_uploaded') {
        const tempToken = generateToken(user);
        
        return NextResponse.json(
          {
            error: 'You must upload your medical certificate before you can login.',
            requires_certificate_upload: true,
            certificate_status: 'not_uploaded',
            temp_token: tempToken, // Temporary token for certificate upload only
            user_id: user.id
          },
          { status: 403 }
        );
      }

      // Also block login if they have uploaded a certificate that's not approved yet
      if (hasCertificate && certificateStatus !== 'approved') {
        let message = '';
        switch (certificateStatus) {
          case 'pending':
            message = 'Your certificate is pending admin approval. Please wait for verification.';
            break;
          case 'rejected':
            message = 'Your certificate has been rejected. Please upload a new certificate or contact support.';
            break;
          default:
            message = 'Your certificate is under review. Please wait for admin approval.';
        }
        return NextResponse.json(
          {
            error: message,
            approval_status: certificateStatus,
            requires_approval: true,
            certificate_status: certificateStatus
          },
          { status: 403 }
        );
      }
    }

    // Remove sensitive fields and generate JWT token
    const { password_hash, ...userWithoutPassword } = user;
    const token = generateToken(user);

    const response: any = {
      message: 'Login successful',
      success: true,
      user: userWithoutPassword,
      token,
      expiresIn: '24h'
    };

    // Add certificate status to response for doctors
    if (user.role === 'doctor') {
      response.certificate_status = certificateStatus;
    }

    return NextResponse.json(response);

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

