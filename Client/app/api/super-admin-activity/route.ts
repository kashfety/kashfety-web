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

    // Use aggregation approach - fetch all admin/super_admin actions from various tables
    let allActivities: any[] = [];

    // Get all admin and super_admin users
    const { data: adminUsers, error: adminUsersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, updated_at, approval_status')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false });

    if (!adminUsersError && adminUsers) {
      adminUsers.forEach((admin: any) => {
        // Admin account creation
        allActivities.push({
          id: `admin_created_${admin.id}`,
          adminId: admin.id,
          adminName: admin.name || admin.email,
          adminRole: admin.role,
          actionType: 'admin_created',
          targetType: 'admin',
          targetId: admin.id,
          actionDetails: {
            message: `Admin account created: ${admin.name || admin.email}`
          },
          ipAddress: 'system',
          userAgent: 'system',
          sessionId: null,
          createdAt: admin.created_at
        });

        // If admin was approved
        if (admin.approval_status === 'approved' && admin.updated_at !== admin.created_at) {
          allActivities.push({
            id: `admin_approved_${admin.id}`,
            adminId: 'system',
            adminName: 'System Admin',
            adminRole: 'super_admin',
            actionType: 'admin_approved',
            targetType: 'admin',
            targetId: admin.id,
            actionDetails: {
              message: `Admin ${admin.name || admin.email} was approved`
            },
            ipAddress: 'system',
            userAgent: 'system',
            sessionId: null,
            createdAt: admin.updated_at
          });
        }
      });
    }

    // Get user actions performed by admins (from users table)
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, updated_at, approval_status')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!usersError && allUsers) {
      allUsers.forEach((user: any) => {
        if (user.approval_status === 'approved' && user.updated_at !== user.created_at) {
          allActivities.push({
            id: `user_approved_${user.id}`,
            adminId: 'system',
            adminName: 'Admin',
            adminRole: 'admin',
            actionType: 'user_approved',
            targetType: 'user',
            targetId: user.id,
            actionDetails: {
              message: `User ${user.name || user.email} was approved`
            },
            ipAddress: 'admin',
            userAgent: 'admin',
            sessionId: null,
            createdAt: user.updated_at
          });
        }
      });
    }

    // Get certificate reviews
    const { data: certificates, error: certError } = await supabase
      .from('doctor_certificates')
      .select('id, doctor_id, status, submitted_at, reviewed_at, reviewed_by')
      .order('submitted_at', { ascending: false })
      .limit(50);

    if (!certError && certificates) {
      certificates.forEach((cert: any) => {
        if (cert.reviewed_at && cert.reviewed_by) {
          allActivities.push({
            id: `cert_review_${cert.id}`,
            adminId: cert.reviewed_by,
            adminName: 'Admin',
            adminRole: 'admin',
            actionType: cert.status === 'approved' ? 'certificate_approved' : 'certificate_rejected',
            targetType: 'certificate',
            targetId: cert.id,
            actionDetails: {
              message: `Certificate ${cert.status}`
            },
            ipAddress: 'admin',
            userAgent: 'admin',
            sessionId: null,
            createdAt: cert.reviewed_at
          });
        }
      });
    }

    // Sort all activities by date
    allActivities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply filters
    let filteredActivities = allActivities;

    if (action_type && action_type !== 'all') {
      filteredActivities = filteredActivities.filter(log => log.actionType === action_type);
    }

    if (admin_id && admin_id !== 'all') {
      filteredActivities = filteredActivities.filter(log => log.adminId === admin_id);
    }

    if (start_date) {
      filteredActivities = filteredActivities.filter(log => new Date(log.createdAt) >= new Date(start_date));
    }

    if (end_date) {
      filteredActivities = filteredActivities.filter(log => new Date(log.createdAt) <= new Date(end_date));
    }

    if (search) {
      filteredActivities = filteredActivities.filter(log => 
        log.actionDetails.message?.toLowerCase().includes(search.toLowerCase()) ||
        log.actionType.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = filteredActivities.length;
    const activities = filteredActivities.slice(offset, offset + limit);

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
