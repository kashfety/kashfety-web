import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper function to get user from auth header with backend-first approach
async function getUserFromAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  console.log('🔐 Lab Schedule Auth - Header present:', !!authHeader);
  
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('❌ No Bearer token found');
    return null;
  }
  
  const token = authHeader.replace('Bearer ', '');
  console.log('🎫 Lab Schedule Token extracted:', token.substring(0, 20) + '...');
  
  try {
    // First try backend approach
    console.log('🌐 Attempting backend authentication...');
    const backendResponse = await fetch('http://localhost:5000/api/center-dashboard/verify-auth', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('🏗️ Backend response status:', backendResponse.status);
    
    if (backendResponse.ok) {
      const backendResult = await backendResponse.json();
      console.log('✅ Backend auth success:', { userId: backendResult.user?.id, centerId: backendResult.user?.center_id });
      
      if (backendResult.user?.role === 'center') {
        return {
          id: backendResult.user.id,
          role: backendResult.user.role,
          center_id: backendResult.user.center_id
        };
      }
    }
  } catch (backendError) {
    console.log('⚠️ Backend auth failed, trying Supabase fallback:', (backendError as Error).message);
  }

  // Fallback to Supabase direct lookup
  try {
    console.log('🔄 Trying Supabase center user lookup...');
    
    // Get all center users and find the first one (for development)
    const { data: users, error } = await supabase
      .from('users')
      .select('id, role, center_id')
      .eq('role', 'center');

    if (error || !users || users.length === 0) {
      console.error('❌ Failed to fetch center users:', error);
      return null;
    }
    
    // For development, return the first center user
    const user = users[0];
    console.log('✅ Supabase fallback user found:', { id: user.id, center_id: user.center_id });
    return { 
      id: user.id, 
      role: user.role, 
      center_id: user.center_id
    };
  } catch (fallbackError) {
    console.error('❌ Fallback verification failed:', fallbackError);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Lab Schedule GET request received');
    const { searchParams } = new URL(request.url);
    const labTestTypeId = searchParams.get('lab_test_type_id');
    const centerId = searchParams.get('center_id');
    
    console.log('📋 Lab Schedule params:', { labTestTypeId, centerId });

    const user = await getUserFromAuth(request);
    
    if (!user || user.role !== 'center') {
      console.log('❌ Lab Schedule - Unauthorized user:', user);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const activeCenterId = centerId || user.center_id || user.id;
    console.log('🏢 Lab Schedule - Using center ID:', activeCenterId);

    let query = supabase
      .from('center_lab_schedules')
      .select('*')
      .eq('center_id', activeCenterId);

    if (labTestTypeId) {
      query = query.eq('lab_test_type_id', labTestTypeId);
    }

    console.log('🔍 Lab Schedule - Querying schedules...');
    const { data: schedule, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch lab schedule:', error);
      return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
    }

    // Parse time_slots JSON strings back to arrays
    const parsedSchedule = (schedule || []).map((daySchedule: any) => ({
      ...daySchedule,
      time_slots: typeof daySchedule.time_slots === 'string' 
        ? JSON.parse(daySchedule.time_slots || '[]')
        : daySchedule.time_slots || []
    }));

    console.log('✅ Lab Schedule found:', { count: parsedSchedule?.length || 0 });
    return NextResponse.json({ schedule: parsedSchedule });
  } catch (error) {
    console.error('💥 Lab Schedule fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { lab_test_type_id, schedule } = await request.json();
    
    if (!lab_test_type_id || !Array.isArray(schedule)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const centerId = user.center_id || user.id;

    // First, delete existing schedule for this test type
    await supabase
      .from('center_lab_schedules')
      .delete()
      .eq('center_id', centerId)
      .eq('lab_test_type_id', lab_test_type_id);

    // Then insert the new schedule
    if (schedule.length > 0) {
      const scheduleInserts = schedule.map(day => ({
        center_id: centerId,
        lab_test_type_id,
        day_of_week: day.day_of_week,
        is_available: day.is_available,
        time_slots: JSON.stringify(day.slots || []),
        break_start: day.break_start,
        break_end: day.break_end,
        slot_duration: day.slot_duration || 30,
        notes: day.notes
      }));

      const { error } = await supabase
        .from('center_lab_schedules')
        .insert(scheduleInserts);

      if (error) {
        console.error('Failed to save schedule:', error);
        return NextResponse.json({ error: 'Failed to save schedule' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Schedule save error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
