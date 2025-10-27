import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointment_id');
    const patientId = searchParams.get('patient_id');
    const doctorId = searchParams.get('doctor_id');

    if (!appointmentId) {
      return NextResponse.json({ success: false, message: 'appointment_id is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let query = supabase
      .from('medical_records')
      .select('id, appointment_id, patient_id, doctor_id, title, description, diagnosis, treatment, prescription, attachments, record_date')
      .eq('appointment_id', appointmentId);

    if (patientId) query = query.eq('patient_id', patientId);
    if (doctorId) query = query.eq('doctor_id', doctorId);

    const { data, error } = await query.order('record_date', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ success: true, records: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch medical records' }, { status: 500 });
  }
} 