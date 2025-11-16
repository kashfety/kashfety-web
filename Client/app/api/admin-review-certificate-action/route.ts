import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token and extract user info
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('🚀 Certificate review action endpoint hit!');
  
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    console.log('🔓 Token decoded:', !!decoded, 'Role:', decoded?.role);

    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin or super_admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      console.log('❌ User is not admin/super_admin, role:', decoded.role);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { certificateId, status, rejection_reason, admin_notes, resubmission_requirements, resubmission_deadline } = body;

    console.log('📝 Admin: Reviewing certificate ID:', certificateId, 'Status:', status);
    console.log('📦 Request body:', body);

    if (!certificateId) {
      return NextResponse.json(
        { error: 'Certificate ID is required' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected', 'resubmission_required'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status', details: `Status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update certificate status
    const { data: certificate, error: certError } = await supabase
      .from('doctor_certificates')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: decoded.id,
        rejection_reason: status === 'rejected' ? rejection_reason : null,
        resubmission_requirements: status === 'resubmission_required' ? resubmission_requirements : null,
        resubmission_deadline: status === 'resubmission_required' ? resubmission_deadline : null,
        admin_notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', certificateId)
      .select('*, doctor:users!doctor_id(id, name, email)')
      .single();

    if (certError) {
      console.error('❌ Error updating certificate:', certError);
      throw certError;
    }

    // Update doctor's approval status based on certificate status
    if (status === 'approved') {
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          approval_status: 'approved',
          updated_at: new Date().toISOString()
        })
        .eq('id', certificate.doctor_id);

      if (userError) {
        console.error('❌ Error updating user approval status:', userError);
        throw userError;
      }
    } else if (status === 'rejected') {
      const { error: userError } = await supabase
        .from('users')
        .update({ 
          approval_status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('id', certificate.doctor_id);

      if (userError) {
        console.error('❌ Error updating user approval status:', userError);
        throw userError;
      }
    }

    console.log('✅ Admin: Certificate reviewed successfully');
    
    return NextResponse.json({
      success: true,
      data: certificate,
      message: `Certificate ${status} successfully`
    });

  } catch (error: any) {
    console.error('❌ Admin certificate review endpoint error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to review certificate',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
