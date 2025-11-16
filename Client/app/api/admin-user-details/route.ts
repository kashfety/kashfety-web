import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('👤 [Admin User Details] Request received');
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || searchParams.get('id');

    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID is required' }, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch user details (including password_hash for admin view)
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*, password_hash')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('❌ Failed to fetch user:', userError);
      return NextResponse.json({ success: false, error: 'User not found', details: userError?.message }, { status: 404 });
    }

    // Fetch related data in parallel
    const [appointmentsResult, medicalRecordsResult, reviewsResult] = await Promise.all([
      // Appointments (simpler query without foreign key joins)
      supabase
        .from('appointments')
        .select('*')
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
        .order('appointment_date', { ascending: false })
        .limit(50),

      // Medical records (simpler query without foreign key join)
      supabase
        .from('medical_records')
        .select('*')
        .eq('patient_id', userId)
        .order('record_date', { ascending: false })
        .limit(50),

      // Reviews (if you have a reviews table)
      supabase
        .from('reviews')
        .select('*')
        .or(`patient_id.eq.${userId},doctor_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    // Transform user data
    const transformedUser = {
      id: user.id,
      name: user.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown',
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
      approval_status: user.approval_status || 'approved',
      is_active: user.is_active !== false,
      specialty: user.specialty,
      certificate_status: user.certificate_status,
      profile_picture: user.profile_picture,
      // Medical info for patients
      medical_history: user.medical_history,
      allergies: user.allergies,
      medications: user.medications,
      date_of_birth: user.date_of_birth,
      gender: user.gender,
      emergency_contact: user.emergency_contact,
      // Doctor-specific fields
      experience_years: user.experience_years,
      consultation_fee: user.consultation_fee,
      bio: user.bio,
      qualifications: user.qualifications,
      home_visits_available: user.home_visits_available,
      rating: user.rating,
      // Password status (for admin view) - don't expose the actual hash
      password_hash: user.password_hash ? 'set' : null
    };

    // Transform appointments and enrich with doctor/center info
    const appointments = [];
    for (const apt of appointmentsResult.data || []) {
      let doctorInfo = null;
      let centerInfo = null;

      if (apt.doctor_id) {
        const { data: doctor } = await supabase
          .from('users')
          .select('id, name, specialty')
          .eq('id', apt.doctor_id)
          .single();
        doctorInfo = doctor;
      }

      if (apt.center_id) {
        const { data: center } = await supabase
          .from('centers')
          .select('id, name')
          .eq('id', apt.center_id)
          .single();
        centerInfo = center;
      }

      appointments.push({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        type: apt.type || apt.appointment_type,
        consultation_fee: apt.consultation_fee,
        doctor: doctorInfo ? {
          id: doctorInfo.id,
          name: doctorInfo.name,
          specialty: doctorInfo.specialty
        } : null,
        center: centerInfo ? {
          id: centerInfo.id,
          name: centerInfo.name
        } : null
      });
    }

    // Transform medical records and enrich with doctor info
    const medicalRecords = [];
    for (const record of medicalRecordsResult.data || []) {
      let doctorInfo = null;
      if (record.doctor_id) {
        const { data: doctor } = await supabase
          .from('users')
          .select('id, name, specialty')
          .eq('id', record.doctor_id)
          .single();
        doctorInfo = doctor;
      }

      medicalRecords.push({
        id: record.id,
        record_date: record.record_date,
        diagnosis: record.diagnosis,
        treatment: record.treatment,
        prescription: record.prescription,
        notes: record.notes,
        doctor: doctorInfo ? {
          id: doctorInfo.id,
          name: doctorInfo.name,
          specialty: doctorInfo.specialty
        } : null
      });
    }

    // Transform reviews
    const reviews = reviewsResult.data || [];

    const stats = {
      totalAppointments: appointments.length,
      totalMedicalRecords: medicalRecords.length,
      totalReviews: reviews.length
    };

    console.log('✅ [Admin User Details] Fetched user:', userId, 'with', appointments.length, 'appointments,', medicalRecords.length, 'records');

    return NextResponse.json({
      success: true,
      data: {
        user: transformedUser,
        appointments,
        medicalRecords,
        reviews,
        stats
      }
    });

  } catch (error: any) {
    console.error('❌ Admin user details API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

