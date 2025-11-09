import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    console.log('📋 [Appointments POST API] Request received');
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
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
      console.log('❌ Missing required fields:', { patient_id, doctor_id, appointment_date, appointment_time });
      return NextResponse.json({
        success: false,
        message: "Missing required fields: patient_id, doctor_id, appointment_date, appointment_time"
      }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🔍 Checking for existing appointment...');
    // Check if slot is already booked
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('id, status, center_id')
      .eq('doctor_id', doctor_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .in('status', ['pending', 'confirmed', 'scheduled'])
      .maybeSingle();

    if (existing) {
      // For center-specific bookings, only block if same center
      if (center_id && existing.center_id && existing.center_id !== center_id) {
        console.log('✅ Different center - slot available');
      } else {
        console.log('❌ Time slot already taken:', existing);
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
      status: 'pending'
    };

    console.log('💾 Creating appointment:', appointmentData);

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert(appointmentData)
      .select('*')
      .single();

    if (error) {
      console.error('❌ Database error:', error);
      throw error;
    }

    console.log('✅ Appointment created:', data);
    return NextResponse.json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: data
    });

  } catch (error: any) {
    console.error('❌ Error booking appointment:', error);
    return NextResponse.json({
      success: false,
      message: error.message || 'Failed to book appointment'
    }, { status: 500 });
  }
}

