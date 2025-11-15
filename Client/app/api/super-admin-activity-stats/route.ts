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

    // Get all admin activity logs
    const { data: allLogs, error: logsError } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:users!audit_logs_user_id_fkey(id, name, email, role)
      `)
      .in('user:users!audit_logs_user_id_fkey.role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })
      .limit(1000); // Get recent 1000 activities for stats

    if (logsError) {
      console.error('❌ Error fetching logs:', logsError);
      throw logsError;
    }

    const logs = allLogs || [];

    // Calculate stats
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const actionsByType: Record<string, number> = {};
    const actionsByAdmin: Record<string, number> = {};
    let actionsToday = 0;
    let actionsThisWeek = 0;

    logs.forEach((log: any) => {
      const createdAt = new Date(log.created_at);
      
      // Count by action type
      const action = log.action || 'unknown';
      actionsByType[action] = (actionsByType[action] || 0) + 1;

      // Count by admin
      const adminId = log.user_id;
      const adminName = log.user?.name || log.user?.email || adminId;
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
      totalActions: logs.length,
      actionsByType,
      actionsByAdmin,
      actionsToday,
      actionsThisWeek,
      topAdmins,
      recentActions: Math.min(logs.length, 50)
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
