import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401
    }
    const { user } = authResult;
    
    const body = await request.json();
    
    const { 
      patient_id, 
      doctor_id, 
      appointment_date, 
      appointment_time, 
      appointment_type, 
      consultation_fee,
      center_id,
      symptoms,
      duration,
      type
    } = body;

    // Validate required fields
    if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
      return NextResponse.json({
        success: false,
        message: "Missing required fields: patient_id, doctor_id, appointment_date, appointment_time"
      }, { status: 400 });
    }
    
    // SECURITY: Patients can only book appointments for themselves
    if (user.role === 'patient' && user.id !== patient_id) {
      return NextResponse.json({
        success: false,
        message: "Forbidden - Patients can only book appointments for themselves"
      }, { status: 403 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if slot is already booked
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('id, status, center_id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['scheduled', 'confirmed'])
      .maybeSingle();

    if (existing) {
      // For center-specific bookings, only block if same center
      if (center_id && existing.center_id && existing.center_id !== center_id) {
      } else {
        return NextResponse.json({
          success: false,
          message: "This time slot is already booked"
        }, { status: 409 });
      }
    }

    // Create the appointment
    const appointmentData = {
      patient_id,
      doctor_id,
      center_id: center_id || null,
      appointment_date,
      appointment_time,
      appointment_type: appointment_type || 'clinic',
      consultation_fee: consultation_fee || null,
      symptoms: symptoms || null,
      duration: duration || 30,
      type: type || 'consultation',
      status: 'scheduled'
    };


    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert(appointmentData)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: data
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to book appointment'
    }, { status: 500 });
  }
}

