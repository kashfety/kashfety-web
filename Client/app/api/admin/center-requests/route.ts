import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
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

    // Get status filter from query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query with status filter
    let query = supabase
      .from('centers')
      .select(`
        id,
        name,
        address,
        phone,
        email,
        center_type,
        approval_status,
        created_at,
        owner_doctor_id,
        users!centers_owner_doctor_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          specialty
        )
      `)
      .order('created_at', { ascending: false });

    // Apply status filter if provided
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      query = query.eq('approval_status', status);
    }

    const { data: centerRequests, error } = await query;

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch center requests' }, { status: 500 });
    }

    // Format the response to match backend API format
    const formattedRequests = centerRequests?.map(request => {
      const doctor = Array.isArray(request.users) ? request.users[0] : request.users;
      return {
        id: request.id,
        name: request.name,
        address: request.address,
        phone: request.phone,
        email: request.email,
        center_type: request.center_type,
        approval_status: request.approval_status,
        created_at: request.created_at,
        owner_doctor_id: request.owner_doctor_id,
        doctor: doctor ? {
          id: doctor.id,
          first_name: doctor.first_name,
          last_name: doctor.last_name,
          email: doctor.email,
          phone: doctor.phone,
          specialty: doctor.specialty
        } : null
      };
    }) || [];


    return NextResponse.json({ 
      success: true, 
      data: formattedRequests 
    });

  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to fetch center requests' }, { status: 500 });
  }
}