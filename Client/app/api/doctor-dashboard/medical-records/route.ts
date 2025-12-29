import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireDoctor } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations (fallback only)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    // Require doctor authentication even in fallback mode
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

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
      return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }

    const { patient_id, appointment_id, diagnosis, treatment, prescription, notes } = body;

    // Use authenticated doctor's ID
    const doctor_id = user.id;

    // Verify appointment exists and belongs to this doctor
    if (appointment_id) {
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('appointments')
        .select('doctor_id, patient_id')
        .eq('id', appointment_id)
        .single();
      if (appointmentError) {
        return NextResponse.json({ error: 'Failed to fetch appointment details' }, { status: 400 });
      }
      if (appointmentData.doctor_id !== doctor_id) {
        return NextResponse.json({
          error: 'Forbidden - You can only create medical records for your own appointments'
        }, { status: 403 });
      }
      if (appointmentData.patient_id !== patient_id) {
        return NextResponse.json({
          error: 'Forbidden - Patient ID does not match appointment'
        }, { status: 403 });
      }
    }
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
      return NextResponse.json({ error: 'Failed to create medical record', details: error }, { status: 500 });
    }
    return NextResponse.json({ success: true, data, message: 'Medical record created successfully' });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Require doctor authentication even in fallback mode
    const authResult = requireDoctor(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }
    const { user } = authResult;

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
      return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
    }

    const patient_id = searchParams.get('patient_id');
    const appointment_id = searchParams.get('appointment_id');
    // Use authenticated doctor's ID instead of query parameter
    const doctor_id = user.id;

    let query = supabase
      .from('medical_records')
      .select(`
        *,
        patient:users!medical_records_patient_id_fkey(name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email),
        doctor:users!medical_records_doctor_id_fkey(name, name_ar, first_name, last_name, first_name_ar, last_name_ar, email)
      `)
      .eq('doctor_id', doctor_id) // Always filter by authenticated doctor
      .order('created_at', { ascending: false });
    if (patient_id) query = query.eq('patient_id', patient_id);
    if (appointment_id) query = query.eq('appointment_id', appointment_id);
    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 });
    }
    return NextResponse.json({ success: true, data, count: data?.length || 0 });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
