import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  
  try {
    // SECURITY: Require admin or super_admin role
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    const { user: adminUser } = authResult;

    const body = await request.json();
    const { certificateId, status, rejection_reason, admin_notes, resubmission_requirements, resubmission_deadline } = body;


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
        reviewed_by: adminUser.id,
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
        throw userError;
      }
    }

    
    return NextResponse.json({
      success: true,
      data: certificate,
      message: `Certificate ${status} successfully`
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to review certificate',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
