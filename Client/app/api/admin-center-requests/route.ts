import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 [Admin Center Requests] Request received');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query for centers
    let query = supabase
      .from('centers')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by approval status if provided
    if (status && status !== 'all') {
      query = query.eq('approval_status', status);
    }

    const { data: centers, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch center requests:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch center requests',
        details: error.message 
      }, { status: 500 });
    }

    // Transform centers to match expected format
    const transformedRequests = (centers || []).map((center: any) => ({
      id: center.id,
      name: center.name,
      address: center.address,
      phone: center.phone,
      email: center.email,
      center_type: center.center_type || 'generic',
      approval_status: center.approval_status || 'pending',
      owner_doctor_id: center.owner_doctor_id,
      offers_labs: center.offers_labs || false,
      offers_imaging: center.offers_imaging || false,
      created_at: center.created_at,
      updated_at: center.updated_at,
      // Additional fields that might be needed
      description: center.description,
      website: center.website
    }));

    console.log('✅ [Admin Center Requests] Fetched', transformedRequests.length, 'center requests with status:', status);

    return NextResponse.json({
      success: true,
      data: transformedRequests
    });

  } catch (error: any) {
    console.error('❌ Admin center requests API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

