import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireRole } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require super_admin role
    const authResult = requireRole(request, ['super_admin']);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'all';
    const status = searchParams.get('status') || 'all';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build count query
    let countQuery = supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .in('role', ['admin', 'super_admin']);

    // Build data query - use * to get all fields, then we'll transform what we need
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

    // Apply pagination and ordering - order by updated_at to get most recently updated first
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dataQuery = dataQuery.range(from, to).order('updated_at', { ascending: false });

    const { data: users, error } = await dataQuery;

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch admins',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 });
    }


    // Transform users to match AdminUser interface
    const transformedAdmins = (users || []).map((user: any) => {
      // Determine the name - prioritize name field, then first_name + last_name, then email prefix, then 'Unknown'
      let displayName = 'Unknown';
      if (user.name && user.name.trim()) {
        displayName = user.name.trim();
      } else if (user.first_name || user.last_name) {
        displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      } else if (user.email) {
        displayName = user.email.split('@')[0];
      }

      // Log name resolution for debugging (only for specific cases to avoid spam)
      if (!user.name || user.email === 'm.ismail.official23@gmail.com') {
      }

      return {
        id: user.id,
        uid: user.uid || user.id,
        name: displayName,
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
      };
    });

    const totalPages = Math.ceil((count || 0) / limit);

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
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

// POST handler for creating admins
export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require super_admin role
    const authResult = requireRole(request, ['super_admin']);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }
    const { user: creator } = authResult;

    const body = await request.json();
    const { name, email, phone, password, role = 'admin' } = body;

    // Validate required fields
    if (!name || !email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Name, email, and password are required'
      }, { status: 400 });
    }

    // Validate role is admin or super_admin only
    if (role !== 'admin' && role !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: 'Invalid role. Must be admin or super_admin'
      }, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: 'Email already in use'
      }, { status: 409 });
    }

    // Hash the password using bcrypt
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create the admin user
    const { data: newAdmin, error: createError } = await supabase
      .from('users')
      .insert({
        name,
        email,
        phone: phone || null,
        password_hash: hashedPassword,
        role,
        is_active: true,
        created_by: creator.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name, email, phone, role, is_active, created_at')
      .single();

    if (createError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create admin',
        details: createError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Admin created successfully',
      data: {
        admin: {
          id: newAdmin.id,
          name: newAdmin.name,
          email: newAdmin.email,
          phone: newAdmin.phone,
          role: newAdmin.role,
          isActive: newAdmin.is_active,
          createdAt: newAdmin.created_at
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

