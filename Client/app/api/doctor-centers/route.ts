import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    // Extract doctor ID from token
    let doctorId = '';
    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        doctorId = payload.id || payload.userId || payload.uid || '';
      } catch (e) {
      }
    }

    if (!doctorId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Doctor ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch doctor's center assignments first
    const { data: assignments, error: assignmentsError } = await supabase
      .from('doctor_centers')
      .select('center_id, is_primary')
      .eq('doctor_id', doctorId);

    if (assignmentsError) {
    }


    const assignmentMap = new Map((assignments || []).map((a: any) => [a.center_id, a]));

    // Fetch all centers
    const { data: allCenters, error: centersError } = await supabase
      .from('centers')
      .select('id, name, name_ar, address, phone, email, center_type, owner_doctor_id, approval_status, created_at, updated_at')
      .eq('approval_status', 'approved');

    if (centersError) {
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
        const belongs = c.owner_doctor_id === doctorId;
        if (!belongs) {
        }
        return belongs;
      }
      return true; // Show all generic centers
    });


    // Mark assigned centers and primary center
    const centersWithAssignment = visibleCenters.map((center: any) => {
      const assignment = assignmentMap.get(center.id);
      const isAssigned = !!assignment;
      const isPrimary = assignment?.is_primary || false;
      
      if (isAssigned) {
      }
      
      return {
        ...center,
        is_assigned: isAssigned,
        is_primary: isPrimary
      };
    });

    // Separate assigned and unassigned centers
    const assignedCenters = centersWithAssignment.filter((c: any) => c.is_assigned);
    

    return NextResponse.json({
      success: true,
      centers: centersWithAssignment,
      assigned_centers: assignedCenters
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

