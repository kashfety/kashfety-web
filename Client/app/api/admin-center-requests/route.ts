import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin or super_admin role
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query for centers - only get centers that need approval (pending, rejected) or all if status is 'all'
    let query = supabase
      .from('centers')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by approval status if provided
    if (status && status !== 'all') {
      query = query.eq('approval_status', status);
    } else if (status === 'all') {
      // For 'all', we might want to prioritize pending/rejected, but let's show all
      // No additional filter needed
    }

    const { data: centers, error } = await query;
    
    console.log('🏥 [Admin Center Requests] Query result:', { 
      status, 
      count: centers?.length || 0,
      statuses: centers?.map((c: any) => c.approval_status) || []
    });

    if (error) {
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


    return NextResponse.json({
      success: true,
      data: transformedRequests
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

