import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('👑 [Super Admin Admins] Request received');
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';

    console.log('👑 [Super Admin Admins] Params:', { page, limit, search, role, status });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build count query
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin']);

    // Build data query
    let dataQuery = supabase
      .from('users')
      .select('*')
      .in('role', ['admin', 'super_admin']);

    // Apply role filter
    if (role && role !== 'all') {
      countQuery = countQuery.eq('role', role);
      dataQuery = dataQuery.eq('role', role);
    }

    // Apply status filter (is_active)
    if (status && status !== 'all') {
      const isActive = status === 'active';
      countQuery = countQuery.eq('is_active', isActive);
      dataQuery = dataQuery.eq('is_active', isActive);
    }

    // Apply search filter
    if (search) {
      const searchFilter = `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`;
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    // Get total count
    const { count } = await countQuery;

    // Apply pagination and ordering
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dataQuery = dataQuery.range(from, to).order('created_at', { ascending: false });

    const { data: users, error } = await dataQuery;

    if (error) {
      console.error('❌ Failed to fetch admins:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch admins',
        details: error.message 
      }, { status: 500 });
    }

    // Transform users to match AdminUser interface
    const transformedAdmins = (users || []).map((user: any) => ({
      id: user.id,
      uid: user.uid || user.id,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role as 'admin' | 'super_admin',
      isActive: user.is_active !== false,
      lastLogin: user.last_login || null,
      loginCount: user.login_count || 0,
      createdAt: user.created_at,
      createdBy: user.created_by || null,
      accountLocked: user.account_locked || false,
      lockReason: user.lock_reason || null,
      lockedAt: user.locked_at || null,
      lockedBy: user.locked_by || null,
      permissions: {
        user_management: user.permissions?.user_management || false,
        admin_management: user.permissions?.admin_management || false,
        system_settings: user.permissions?.system_settings || false,
        audit_logs: user.permissions?.audit_logs || false,
        all: user.permissions?.all || user.role === 'super_admin'
      }
    }));

    const totalPages = Math.ceil((count || 0) / limit);

    console.log('✅ [Super Admin Admins] Fetched', transformedAdmins.length, 'admins (page', page, 'of', totalPages, ')');

    return NextResponse.json({
      success: true,
      data: {
        admins: transformedAdmins,
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
    console.error('❌ Super admin admins API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// POST handler for creating admins - password hashing should be handled by backend
// This route is kept for future implementation if needed

