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
  console.log('📊 Super Admin activity stats endpoint hit!');
  
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is super_admin
    if (decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    console.log('📊 Calculating activity stats...');

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
          actionType: 'admin_created',
          adminName: admin.name || admin.email,
          createdAt: admin.created_at
        });

        // If admin was approved
        if (admin.approval_status === 'approved' && admin.updated_at !== admin.created_at) {
          allActivities.push({
            actionType: 'admin_approved',
            adminName: 'System Admin',
            createdAt: admin.updated_at
          });
        }
      });
    }

    // Get user actions performed by admins
    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, updated_at, approval_status')
      .order('created_at', { ascending: false })
      .limit(200);

    if (!usersError && allUsers) {
      allUsers.forEach((user: any) => {
        if (user.approval_status === 'approved' && user.updated_at !== user.created_at) {
          allActivities.push({
            actionType: 'user_approved',
            adminName: 'Admin',
            createdAt: user.updated_at
          });
        }
      });
    }

    // Get certificate reviews
    const { data: certificates, error: certError } = await supabase
      .from('doctor_certificates')
      .select('id, status, submitted_at, reviewed_at, reviewed_by')
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (!certError && certificates) {
      certificates.forEach((cert: any) => {
        if (cert.reviewed_at && cert.reviewed_by) {
          allActivities.push({
            actionType: cert.status === 'approved' ? 'certificate_approved' : 'certificate_rejected',
            adminName: 'Admin',
            createdAt: cert.reviewed_at
          });
        }
      });
    }

    // Calculate stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const actionsByType: Record<string, number> = {};
    const actionsByAdmin: Record<string, number> = {};
    let actionsToday = 0;
    let actionsThisWeek = 0;

    allActivities.forEach((activity: any) => {
      const createdAt = new Date(activity.createdAt);
      
      // Count by action type
      const action = activity.actionType || 'unknown';
      actionsByType[action] = (actionsByType[action] || 0) + 1;

      // Count by admin
      const adminName = activity.adminName || 'Unknown';
      actionsByAdmin[adminName] = (actionsByAdmin[adminName] || 0) + 1;

      // Count today's actions
      if (createdAt >= todayStart) {
        actionsToday++;
      }

      // Count this week's actions
      if (createdAt >= weekStart) {
        actionsThisWeek++;
      }
    });

    // Get top admins
    const topAdmins = Object.entries(actionsByAdmin)
      .map(([adminName, count]) => ({
        adminId: adminName,
        adminName: adminName,
        actionCount: count as number
      }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 5);

    const stats = {
      totalActions: allActivities.length,
      actionsByType,
      actionsByAdmin,
      actionsToday,
      actionsThisWeek,
      topAdmins,
      recentActions: Math.min(allActivities.length, 50)
    };

    console.log('✅ Activity stats calculated:', {
      totalActions: stats.totalActions,
      actionsToday: stats.actionsToday,
      actionsThisWeek: stats.actionsThisWeek
    });

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ Super admin activity stats error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch activity stats',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
