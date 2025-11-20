import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { requestId, action } = body;

    console.log('📥 [Center Request Action] Request body:', { requestId, action });

    // Validate required fields
    if (!requestId || !action) {
      return NextResponse.json(
        { error: 'Request ID and action are required', success: false },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "reject"', success: false },
        { status: 400 }
      );
    }

    // Get the center from the centers table
    const { data: center, error: fetchError } = await supabase
      .from('centers')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !center) {
      console.error('❌ [Center Request Action] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Center not found', success: false },
        { status: 404 }
      );
    }

    // Update the center approval status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const { error: updateError } = await supabase
      .from('centers')
      .update({
        approval_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ [Center Request Action] Update error:', updateError);
      throw new Error(updateError.message || 'Failed to update center');
    }

    console.log(`✅ [Center Request Action] Request ${action}d successfully:`, requestId);

    return NextResponse.json({
      message: `Center request ${action}d successfully`,
      success: true
    });

  } catch (error: any) {
    console.error('❌ [Center Request Action] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}
