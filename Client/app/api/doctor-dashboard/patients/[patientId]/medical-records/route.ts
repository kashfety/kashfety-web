import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  request: NextRequest,
  { params }: { params: { patientId: string } }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/patients/${params.patientId}/medical-records`, {
          method: 'GET',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
      } catch (e) {
        // continue to fallback
      }
    }

    if (!FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const { patientId } = await params;
    console.log('📋 Fetching medical records for patient:', patientId);

    const { data, error } = await supabase
      .from('medical_records')
      .select(`
        *,
        appointment:appointments!medical_records_appointment_id_fkey(
          id,
          appointment_date,
          appointment_time,
          status
        )
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Fetch medical records error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch medical records' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${data?.length || 0} medical records for patient`);

    return NextResponse.json({
      success: true,
      records: data || [],
      count: data?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
