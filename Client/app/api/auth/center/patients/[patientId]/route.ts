import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> | { patientId: string } }
) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Handle both Promise and direct params for NextJS compatibility
  const resolvedParams = await (params instanceof Promise ? params : Promise.resolve(params));
  const { patientId } = resolvedParams;

  console.log('🔍 Patient API Debug:', { patientId, hasAuth: !!authHeader });

  if (!patientId) {
    console.log('❌ Patient ID is missing');
    return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
  }

  // Try backend first if JWT provided
  if (authHeader) {
    try {
      console.log('🔄 Attempting backend request for patient:', patientId);
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/patients/${patientId}`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      console.log('📊 Backend patient response:', response.status, data);
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

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (patientError) {
      console.error('Failed to fetch patient:', patientError);
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      patient
    });

  } catch (error: any) {
    console.error('Center patient details fallback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch patient details' }, { status: 500 });
  }
}
