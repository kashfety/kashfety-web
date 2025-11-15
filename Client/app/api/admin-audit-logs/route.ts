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
  console.log('📋 Audit logs endpoint hit!');
  
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

    // Check if user is admin or super_admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      console.log('❌ User is not admin/super_admin, role:', decoded.role);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    console.log('📝 Fetching audit logs - Page:', page, 'Limit:', limit);

    // Fetch audit logs from database
    const { data: logs, error: logsError, count } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (logsError) {
      console.error('❌ Error fetching audit logs:', logsError);
      throw logsError;
    }

    console.log('✅ Fetched', logs?.length || 0, 'audit logs');

    return NextResponse.json({
      success: true,
      data: {
        logs: logs || [],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Audit logs endpoint error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch audit logs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
