import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/doctors/:doctorId/working-days
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await params;
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('center_id');
    
    // Use service role key for production to bypass RLS
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      throw error;
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
      message: error.message || 'Failed to fetch doctor working days' 
    }, { status: 500 });
  }
}
