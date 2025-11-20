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

    // Get the center request
    const { data: centerRequest, error: fetchError } = await supabase
      .from('center_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !centerRequest) {
      console.error('❌ [Center Request Action] Fetch error:', fetchError);
      return NextResponse.json(
        { error: 'Center request not found', success: false },
        { status: 404 }
      );
    }

    // Update the center request status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const { error: updateError } = await supabase
      .from('center_requests')
      .update({
        status: newStatus,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('❌ [Center Request Action] Update error:', updateError);
      throw new Error(updateError.message || 'Failed to update center request');
    }

    // If approved, create the center in the centers table (if not already exists)
    if (action === 'approve') {
      // Check if center already exists
      const { data: existingCenter } = await supabase
        .from('centers')
        .select('id')
        .eq('email', centerRequest.email)
        .single();

      if (!existingCenter) {
        // Create center
        const centerData = {
          id: centerRequest.center_id || require('crypto').randomUUID(),
          name: centerRequest.name,
          name_ar: centerRequest.name_ar,
          address: centerRequest.address,
          phone: centerRequest.phone,
          email: centerRequest.email,
          center_type: centerRequest.center_type || 'generic',
          offers_labs: centerRequest.offers_labs || false,
          offers_imaging: centerRequest.offers_imaging || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: centerError } = await supabase
          .from('centers')
          .insert([centerData]);

        if (centerError) {
          console.error('⚠️ [Center Request Action] Center creation error:', centerError);
          // Don't fail the approval if center creation fails
        } else {
          console.log('✅ [Center Request Action] Center created successfully');
          
          // Update user with center_id if user exists
          if (centerRequest.user_id) {
            await supabase
              .from('users')
              .update({ center_id: centerData.id })
              .eq('id', centerRequest.user_id);
          }
        }
      }
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
