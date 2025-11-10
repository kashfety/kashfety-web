import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 [Admin Centers] Request received');
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    console.log('🏥 [Admin Centers] Params:', { page, limit, search, status });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build count query first
    let countQuery = supabase
      .from('centers')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabase
      .from('centers')
      .select('*');

    // Apply filters to both queries
    if (status && status !== 'all') {
      if (status === 'approved') {
        countQuery = countQuery.eq('approval_status', 'approved');
        dataQuery = dataQuery.eq('approval_status', 'approved');
      } else if (status === 'pending') {
        countQuery = countQuery.eq('approval_status', 'pending');
        dataQuery = dataQuery.eq('approval_status', 'pending');
      } else if (status === 'rejected') {
        countQuery = countQuery.eq('approval_status', 'rejected');
        dataQuery = dataQuery.eq('approval_status', 'rejected');
      }
    }

    // Apply search to both queries
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
      dataQuery = dataQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await countQuery;

    // Apply pagination and ordering to data query
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dataQuery = dataQuery.range(from, to).order('created_at', { ascending: false });

    const { data: centers, error } = await dataQuery;

    if (error) {
      console.error('❌ Failed to fetch centers:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch centers',
        details: error.message 
      }, { status: 500 });
    }

    // Transform centers to match expected format
    const transformedCenters = (centers || []).map((center: any) => ({
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
      is_active: center.is_active !== false, // Default to true if not set
      created_at: center.created_at,
      updated_at: center.updated_at
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    console.log('✅ [Admin Centers] Fetched', transformedCenters.length, 'centers (page', page, 'of', totalPages, ')');

    return NextResponse.json({
      success: true,
      data: {
        centers: transformedCenters,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Admin centers API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

