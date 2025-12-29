import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = searchParams.get('doctorId');
    const centerId = searchParams.get('center_id');
    

    if (!doctorId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Doctor ID is required as query parameter' 
      }, { status: 400 });
    }

    // Use service role key for production to bypass RLS
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from('doctor_schedules')
      .select('day_of_week')
      .eq('doctor_id', doctorId)
      .eq('is_available', true);
      
    if (centerId) {
      query = query.eq('center_id', centerId);
    }
    
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch doctor working days' 
      }, { status: 500 });
    }

    // Get unique working days and sort them
    const workingDays = [...new Set((data || []).map((r: any) => Number(r.day_of_week)))].sort((a, b) => a - b);
    

    return NextResponse.json({ 
      success: true, 
      working_days: workingDays,
      workingDays: workingDays // Support both formats for backward compatibility
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    }, { status: 500 });
  }
}

