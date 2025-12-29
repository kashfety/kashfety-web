import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    // Require doctor authentication with proper token verification
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;
    
    const userId = user.id;

    // Don't create any certificate record - just let the absence of records indicate they skipped
    // The login route will check if no certificates exist and allow login with certificate_status: 'not_uploaded'
    
    // Update user's approval status to pending (waiting for certificate upload)
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate upload skipped. You can upload later from your dashboard.'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
