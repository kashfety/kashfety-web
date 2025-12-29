import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointment_id');
    const doctorId = searchParams.get('doctor_id');
    const patientId = searchParams.get('patient_id') || authenticatedUser.id;
    const appointmentIdsCsv = searchParams.get('appointment_ids');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // If patientId is specified, verify it matches authenticated user (unless admin)
    if (patientId && authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      if (patientId !== authenticatedUser.id) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden - You can only view your own reviews'
        }, { status: 403 });
      }
    }

    // Batch check: return which appointment_ids have a review by this patient
    if (appointmentIdsCsv && patientId) {
      const ids = appointmentIdsCsv.split(',').map((s) => s.trim()).filter(Boolean);
      if (ids.length === 0) return NextResponse.json({ success: true, reviews: [], reviewedAppointmentIds: [] });
      const { data, error } = await supabase
        .from('reviews')
        .select('appointment_id')
        .eq('patient_id', patientId)
        .in('appointment_id', ids);
      if (error) throw error;
      const reviewedAppointmentIds = Array.from(new Set((data || []).map((r: any) => r.appointment_id)));
      return NextResponse.json({ success: true, reviews: [], reviewedAppointmentIds });
    }

    let query = supabase.from('reviews').select('id, appointment_id, doctor_id, patient_id, rating, comment, created_at');
    if (appointmentId) query = query.eq('appointment_id', appointmentId);
    if (doctorId) query = query.eq('doctor_id', doctorId);
    if (patientId) query = query.eq('patient_id', patientId);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    return NextResponse.json({ success: true, reviews: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user: authenticatedUser } = authResult;

    const body = await request.json();
    const { appointment_id, doctor_id, patient_id, rating, comment } = body || {};

    if (!appointment_id || !doctor_id || !patient_id || !rating) {
      return NextResponse.json({ success: false, message: 'appointment_id, doctor_id, patient_id and rating are required' }, { status: 400 });
    }

    // Verify patient_id matches authenticated user (unless admin)
    // Only patients can submit reviews for their own appointments
    if (authenticatedUser.role === 'patient') {
      if (patient_id !== authenticatedUser.id) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden - You can only create reviews for your own appointments'
        }, { status: 403 });
      }
    } else if (authenticatedUser.role !== 'admin' && authenticatedUser.role !== 'super_admin') {
      // Other roles (doctors, centers) cannot submit reviews
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Only patients and admins can submit reviews'
      }, { status: 403 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Ensure the appointment is completed and belongs to the patient and doctor
    const { data: apt, error: aptErr } = await supabase
      .from('appointments')
      .select('id, status, doctor_id, patient_id')
      .eq('id', appointment_id)
      .single();
    if (aptErr || !apt) return NextResponse.json({ success: false, message: 'Appointment not found' }, { status: 404 });
    if (apt.status !== 'completed') return NextResponse.json({ success: false, message: 'Only completed appointments can be reviewed' }, { status: 400 });
    if (apt.doctor_id !== doctor_id || apt.patient_id !== patient_id) return NextResponse.json({ success: false, message: 'Invalid doctor or patient for this appointment' }, { status: 400 });

    // Upsert review (one per appointment/patient)
    const { data: existing } = await supabase
      .from('reviews')
      .select('id')
      .eq('appointment_id', appointment_id)
      .eq('patient_id', patient_id)
      .maybeSingle();

    let reviewId: string | null = existing?.id || null;
    if (reviewId) {
      const { error: updErr } = await supabase
        .from('reviews')
        .update({ rating, comment: comment || null })
        .eq('id', reviewId);
      if (updErr) throw updErr;
    } else {
      const { data: ins, error: insErr } = await supabase
        .from('reviews')
        .insert({ appointment_id, doctor_id, patient_id, rating, comment: comment || null })
        .select('id')
        .single();
      if (insErr) throw insErr;
      reviewId = ins?.id || null;
    }

    // Recompute doctor average rating and update users.rating
    const { data: ratings, error: rateErr } = await supabase
      .from('reviews')
      .select('rating')
      .eq('doctor_id', doctor_id);
    if (rateErr) throw rateErr;

    const avg = ratings && ratings.length > 0 ? (ratings.reduce((s: number, r: any) => s + Number(r.rating || 0), 0) / ratings.length) : rating;
    await supabase
      .from('users')
      .update({ rating: avg })
      .eq('id', doctor_id);

    return NextResponse.json({ success: true, review_id: reviewId, rating: avg });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to submit review' }, { status: 500 });
  }
} 