import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Verify admin role
    let isAdmin = false;
    try {
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
      isAdmin = payload.role === 'admin' || payload.role === 'super_admin';
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const centerId = params.id;
    const body = await request.json().catch(() => ({}));
    const { action } = body;

    console.log('🚨 NEXT.JS API: Processing center approval', { centerId, action });

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be either "approve" or "reject"' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Update the approval status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    const { data, error } = await supabase
      .from('centers')
      .update({ 
        approval_status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', centerId)
      .select()
      .single();

    if (error) {
      console.error('Error updating center approval status:', error);
      return NextResponse.json({ error: 'Failed to update center status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Center not found' }, { status: 404 });
    }

    console.log('🚨 NEXT.JS API: Center', action + 'd', 'successfully');

    return NextResponse.json({ 
      success: true, 
      data: data,
      message: `Center ${action}d successfully`
    });

  } catch (e: any) {
    console.error('Admin center approval PUT error:', e);
    return NextResponse.json({ error: e.message || 'Failed to update center status' }, { status: 500 });
  }
}