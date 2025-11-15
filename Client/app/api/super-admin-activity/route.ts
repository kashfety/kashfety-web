import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token and extract user info
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('📋 Super Admin activity endpoint hit!');
  
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    console.log('🔓 Token decoded:', !!decoded, 'Role:', decoded?.role);

    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    if (decoded.role !== 'super_admin') {
      console.log('❌ User is not super_admin, role:', decoded.role);
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');
    const action_type = searchParams.get('action_type');
    const admin_id = searchParams.get('admin_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const offset = (page - 1) * limit;

    console.log('📝 Fetching admin activities - Page:', page, 'Limit:', limit, 'Filters:', { search, action_type, admin_id, start_date, end_date });

    // Check if audit_logs table exists, if not use the aggregation approach like admin-audit-logs
    let activities: any[] = [];
    
    // Try to fetch from audit_logs table first
    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(id, name, email, role)
      `)
      .in('user:users!audit_logs_user_id_fkey.role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });

    // Apply filters
    if (action_type && action_type !== 'all') {
      query = query.eq('action', action_type);
    }

    if (admin_id && admin_id !== 'all') {
      query = query.eq('user_id', admin_id);
    }

    if (start_date) {
      query = query.gte('created_at', start_date);
    }

    if (end_date) {
      query = query.lte('created_at', end_date);
    }

    if (search) {
      query = query.or(`details.ilike.%${search}%,action.ilike.%${search}%`);
    }

    // Get total count
    const countQuery = supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('user:users!audit_logs_user_id_fkey.role', ['admin', 'super_admin']);

    if (action_type && action_type !== 'all') {
      countQuery.eq('action', action_type);
    }
    if (admin_id && admin_id !== 'all') {
      countQuery.eq('user_id', admin_id);
    }
    if (start_date) {
      countQuery.gte('created_at', start_date);
    }
    if (end_date) {
      countQuery.lte('created_at', end_date);
    }

    const [{ data: logs, error: logsError }, { count, error: countError }] = await Promise.all([
      query.range(offset, offset + limit - 1),
      countQuery
    ]);

    if (!logsError && logs) {
      // Transform to AdminActivityLog format
      activities = logs.map((log: any) => ({
        id: log.id,
        adminId: log.user_id,
        adminName: log.user?.name || 'Unknown Admin',
        adminRole: log.user?.role || 'admin',
        actionType: log.action,
        targetType: log.resource_type,
        targetId: log.resource_id,
        actionDetails: {
          message: log.details
        },
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        sessionId: null,
        createdAt: log.created_at
      }));
    }

    const total = count || 0;

    console.log(`✅ Super Admin: Retrieved ${activities.length} admin activities (${total} total)`);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ Super admin activity endpoint error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch admin activities',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
