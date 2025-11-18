import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations (fallback only)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const body = await request.json();

    // Prefer secured backend with JWT
    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/medical-records`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // fall back if allowed
      }
    }

    if (!FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    console.log('🏥 Fallback: Creating medical record...');
    const { patient_id, appointment_id, diagnosis, treatment, prescription, notes } = body;

    // Derive doctor_id from appointment
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('doctor_id')
      .eq('id', appointment_id)
      .single();
    if (appointmentError) {
      console.error('❌ Error fetching appointment:', appointmentError);
      return NextResponse.json({ error: 'Failed to fetch appointment details' }, { status: 400 });
    }

    const doctor_id = appointmentData.doctor_id;
    const { data, error } = await supabase
      .from('medical_records')
      .insert([
        {
          patient_id,
          doctor_id,
          appointment_id,
          record_type: 'consultation',
          title: 'Consultation Record',
          description: notes,
          diagnosis,
          treatment,
          prescription,
          record_date: new Date().toISOString().split('T')[0],
        },
      ])
      .select()
      .single();
    if (error) {
      console.error('❌ Create medical record error:', error);
      return NextResponse.json({ error: 'Failed to create medical record', details: error }, { status: 500 });
    }
    return NextResponse.json({ success: true, data, message: 'Medical record created successfully' });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    // Prefer secured backend with JWT
    if (authHeader) {
      try {
        const url = new URL(`${BACKEND_URL}/api/doctor-dashboard/medical-records`);
        searchParams.forEach((v, k) => url.searchParams.set(k, v));
        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // fall back if allowed
      }
    }

    if (!FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const patient_id = searchParams.get('patient_id');
    const doctor_id = searchParams.get('doctor_id');
    const appointment_id = searchParams.get('appointment_id');

    let query = supabase
      .from('medical_records')
      .select(`
        *,
        patient:users!medical_records_patient_id_fkey(name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email),
        doctor:users!medical_records_doctor_id_fkey(name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email)
      `)
      .order('created_at', { ascending: false });
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (doctor_id) query = query.eq('doctor_id', doctor_id);
    if (appointment_id) query = query.eq('appointment_id', appointment_id);
    const { data, error } = await query;
    if (error) {
      console.error('❌ Fetch medical records error:', error);
      return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data, count: data?.length || 0 });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
