import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/patients`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      console.error('Backend request failed:', e);
      // fall back to supabase
    }
  }

  // Supabase fallback: requires center_id query param
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  
  try {
    const centerId = searchParams.get('center_id');
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get patients who have bookings at this center
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        patient_id,
        created_at,
        patients:patient_id (
          name,
          email,
          phone
        )
      `)
      .eq('center_id', centerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching center patients:', error);
      return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 });
    }

    // Remove duplicates and format the data
    const uniquePatients = Array.from(
      new Map(
        (bookings || []).map((booking: any) => [
          booking.patient_id, 
          {
            id: booking.patient_id,
            name: booking.patients?.name || 'Unknown Patient',
            email: booking.patients?.email || '',
            phone: booking.patients?.phone || '',
            created_at: booking.created_at
          }
        ])
      ).values()
    );

    return NextResponse.json({
      success: true,
      patients: uniquePatients
    });

  } catch (error: any) {
    console.error('Center patients fallback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch patients' }, { status: 500 });
  }
}
