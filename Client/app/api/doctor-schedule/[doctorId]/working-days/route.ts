import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET /api/doctor-schedule/:doctorId/working-days[?center_id=...]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ doctorId: string }> | { doctorId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('center_id') || undefined;
    
    // Handle both Promise and synchronous params (Next.js 14 vs 15)
    const resolvedParams = params instanceof Promise ? await params : params;
    const { doctorId } = resolvedParams;


    // Try backend first
    try {
      const qs = new URLSearchParams();
      if (centerId) qs.set('center_id', centerId);

      const url = `${BACKEND_URL}/api/doctor-schedule/${doctorId}/working-days${qs.toString() ? `?${qs.toString()}` : ''}`;
      const response = await fetch(url, { method: 'GET' });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
      }
    } catch (backendError) {
    }

    // FALLBACK: Query Supabase directly
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
        message: 'Failed to fetch doctor working days',
        details: error.message
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
