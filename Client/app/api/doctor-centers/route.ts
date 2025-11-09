import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🏥 [Doctor Centers] Request received');

    // Extract doctor ID from token
    let doctorId = '';
    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        doctorId = payload.id || payload.userId || payload.uid || '';
        console.log('🏥 [Doctor Centers] Doctor ID:', doctorId);
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    if (!doctorId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Doctor ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all centers
    const { data: allCenters, error: centersError } = await supabase
      .from('centers')
      .select('*')
      .eq('approval_status', 'approved');

    if (centersError) {
      console.error('❌ Error fetching centers:', centersError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch centers',
        details: centersError.message 
      }, { status: 500 });
    }

    // Filter out personal clinics that don't belong to this doctor
    const visibleCenters = (allCenters || []).filter((c: any) => {
      const type = (c.center_type || 'generic').toLowerCase();
      if (type === 'personal') {
        return c.owner_doctor_id === doctorId;
      }
      return true; // Show all generic centers
    });

    console.log('🏥 [Doctor Centers] Visible centers:', visibleCenters.length);

    // Fetch doctor's center assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('doctor_centers')
      .select('center_id, is_primary')
      .eq('doctor_id', doctorId);

    if (assignmentsError) {
      console.error('❌ Error fetching assignments:', assignmentsError);
    }

    const assignmentMap = new Map((assignments || []).map((a: any) => [a.center_id, a]));

    // Mark assigned centers and primary center
    const centersWithAssignment = visibleCenters.map((center: any) => {
      const assignment = assignmentMap.get(center.id);
      return {
        ...center,
        is_assigned: !!assignment,
        is_primary: assignment?.is_primary || false
      };
    });

    // Separate assigned and unassigned centers
    const assignedCenters = centersWithAssignment.filter((c: any) => c.is_assigned);
    
    console.log('✅ [Doctor Centers] Assigned:', assignedCenters.length, 'Total visible:', centersWithAssignment.length);

    return NextResponse.json({
      success: true,
      centers: centersWithAssignment,
      assigned_centers: assignedCenters
    });

  } catch (error: any) {
    console.error('❌ Doctor centers error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

