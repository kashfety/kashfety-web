import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {

    // Require admin authentication
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user: authenticatedUser } = authResult;


    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';


    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build count query first
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabase
      .from('users')
      .select('*');

    // Apply filters to both queries
    if (role && role !== 'all') {
      countQuery = countQuery.eq('role', role);
      dataQuery = dataQuery.eq('role', role);
    }

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
      } else if (status === 'active') {
        countQuery = countQuery.eq('is_active', true);
        dataQuery = dataQuery.eq('is_active', true);
      } else if (status === 'inactive') {
        countQuery = countQuery.eq('is_active', false);
        dataQuery = dataQuery.eq('is_active', false);
      }
    }

    // Apply search to both queries
    if (search) {
      countQuery = countQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      dataQuery = dataQuery.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await countQuery;

    // Apply pagination and ordering to data query
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dataQuery = dataQuery.range(from, to).order('created_at', { ascending: false });

    const { data: users, error } = await dataQuery;

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch users',
        details: error.message
      }, { status: 500 });
    }

    // Transform users to match expected format
    const transformedUsers = (users || []).map((user: any) => ({
      id: user.id,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      approval_status: user.approval_status || 'approved',
      is_active: user.is_active !== false, // Default to true if not set
      specialty: user.specialty,
      certificate_status: user.certificate_status,
      profile_picture: user.profile_picture,
      // Password hash removed for security - admins should not see password hashes
      // Medical info for patients
      medical_history: user.medical_history,
      allergies: user.allergies,
      medications: user.medications,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      emergency_contact: user.emergency_contact
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    ');

    return NextResponse.json({
      success: true,
      data: {
        users: transformedUsers,
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
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

