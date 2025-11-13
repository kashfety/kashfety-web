import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/doctor-dashboard/analytics`, {
          method: 'GET',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        // fall through on non-OK
      } catch (e) {
        // fall back to Supabase below
      }
    }

    if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });

    // Supabase fallback requires doctor_id
    const doctorId = searchParams.get('doctor_id');
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Compute minimal analytics: total patients and appointments this month for doctor
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);
    const startStr = startOfMonth.toISOString().slice(0, 10);

    const { data: appts, error: apptErr } = await supabase
      .from('appointments')
      .select('patient_id, status, appointment_date, consultation_fee')
      .eq('doctor_id', doctorId)
      .gte('appointment_date', startStr);
    if (apptErr) throw apptErr;

    const uniquePatients = new Set<string>();
    let thisMonthAppointments = 0;
    let completed = 0;
    let monthlyRevenue = 0;

    for (const a of appts || []) {
      const row = a as any;
      if (row.patient_id) uniquePatients.add(row.patient_id);
      thisMonthAppointments++;
      const isCompleted = (row.status || '').toLowerCase() === 'completed';
      if (isCompleted) {
        completed++;
        const fee = Number(row.consultation_fee || 0);
        if (!Number.isNaN(fee)) monthlyRevenue += fee;
      }
    }

    const completionRate = thisMonthAppointments > 0 ? Math.round((completed / thisMonthAppointments) * 100) : 0;

    // Average rating: calculate from reviews table and round to 2 decimal places
    let avgRating = 0;
    const { data: ratings } = await supabase
      .from('reviews')
      .select('rating')
      .eq('doctor_id', doctorId);
    
    if (ratings && ratings.length > 0) {
      const sum = ratings.reduce((s: number, r: any) => s + Number(r.rating || 0), 0);
      avgRating = Math.round((sum / ratings.length) * 100) / 100; // Round to 2 decimal places
    } else {
      // Fallback to users.rating if no reviews exist
      const { data: docRow } = await supabase
        .from('users')
        .select('rating')
        .eq('id', doctorId)
        .single();
      if (docRow && typeof docRow.rating !== 'undefined' && docRow.rating !== null) {
        avgRating = Math.round(Number(docRow.rating) * 100) / 100; // Round to 2 decimal places
      }
    }

    return NextResponse.json({
      analytics: {
        totalPatients: uniquePatients.size,
        thisMonthAppointments,
        completionRate,
        avgRating,
        totalRevenue: monthlyRevenue,
        patientDemographics: {
          ageGroups: {},
          genderDistribution: {},
          appointmentTypes: {},
        },
      },
      billing: {
        monthlyRevenue,
        monthlyGrowth: 0,
      },
    });
  } catch (e: any) {
    console.error('Proxy error (/api/doctor-dashboard/analytics GET):', e);
    return NextResponse.json({ error: e.message || 'Failed to connect to backend server' }, { status: 500 });
  }
}
