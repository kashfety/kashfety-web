import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/doctors/:doctorId/working-days
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ doctorId: string }> }
) {
  try {
    const { doctorId } = await context.params;
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('center_id');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    let query = supabase
      .from('doctor_schedules')
      .select('day_of_week')
      .eq('doctor_id', doctorId)
      .eq('is_available', true);
    if (centerId) query = query.eq('center_id', centerId);
    const { data, error } = await query;

    if (error) throw error;

  const workingDays = (data || []).map((r: any) => Number(r.day_of_week));
    return NextResponse.json({ success: true, workingDays });
  } catch (error: any) {
    console.error('working-days error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Failed to fetch doctor working days' }, { status: 500 });
  }
}
