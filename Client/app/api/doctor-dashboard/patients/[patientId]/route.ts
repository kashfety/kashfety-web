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
        const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/patients/${params.patientId}`, {
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
    console.log('👤 Fetching patient details:', patientId);

    // Fetch patient from users table where role = 'patient'
    // Include all medical information fields
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        gender,
        date_of_birth,
        medical_history,
        allergies,
        medications,
        emergency_contact,
        created_at,
        updated_at
      `)
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (error) {
      console.error('❌ Fetch patient error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch patient details' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    console.log('✅ Patient found:', data.name);

    return NextResponse.json({
      success: true,
      patient: data
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
