import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const { reason } = await request.json();


    if (!appointmentId) {
      return NextResponse.json({
        success: false,
        message: 'Appointment ID is required'
      }, { status: 400 });
    }

    // Get authorization header to check user role
    const authHeader = request.headers.get('authorization');
    let userRole = null;
    let userId = null;
    let userRoleFromDB = null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');

        // Decode the custom JWT token (not Supabase Auth)
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (decoded) {
          userId = decoded.id;  // The user's database ID
          userRole = decoded.role;  // The user's role from the token

          console.log('👤 [Appointment Cancel] Decoded JWT:', {
            userId: decoded.id,
            uid: decoded.uid,
            email: decoded.email,
            role: decoded.role,
            name: decoded.name
          });

          // Optionally fetch fresh role from database for extra security
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', userId)
            .single();

          if (!userError && userData) {
            userRoleFromDB = userData.role;
          } else if (userError) {
          }

          // Use database role if available, otherwise use token role
          userRole = userRoleFromDB || userRole;
        } else {
        }
      } catch (error) {
      }
    } else {
    }    // First, check if the appointment exists and get doctor_id
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time, doctor_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      return NextResponse.json({
        success: false,
        message: 'Appointment not found'
      }, { status: 404 });
    }

    // Check if the user is the doctor for this appointment (alternative to role check)
    const isAppointmentDoctor = userId && appointment.doctor_id === userId;
    console.log('🔍 [Appointment Cancel] User check:', {
      userId,
      doctorId: appointment.doctor_id,
      patientId: appointment.patient_id,
      isAppointmentDoctor,
      userRole,
      userRoleFromDB
    });

    // Check if appointment is already cancelled
    if (appointment.status === 'cancelled') {
      return NextResponse.json({
        success: false,
        message: 'Appointment is already cancelled'
      }, { status: 400 });
    }

    // Check if cancellation is within 24 hours of appointment time
    // Note: Doctors and admins can cancel anytime, patients have 24-hour restriction
    const isDoctorOrAdmin = userRole === 'doctor' || userRole === 'admin' || userRole === 'super_admin';
    const canBypassRestrictions = isDoctorOrAdmin || isAppointmentDoctor;

    console.log('🔐 [Appointment Cancel] Authorization:', {
      isDoctorOrAdmin,
      isAppointmentDoctor,
      canBypassRestrictions,
      userRole,
      userRoleFromDB,
      userId
    });

    if (appointment.appointment_date && appointment.appointment_time) {
      // Parse appointment date and time correctly
      const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
      const now = new Date();
      const millisecondsUntilAppointment = appointmentDateTime.getTime() - now.getTime();
      const hoursUntilAppointment = millisecondsUntilAppointment / (1000 * 60 * 60);

      console.log('⏰ [Appointment Cancel] Time check:', {
        appointmentDate: appointment.appointment_date,
        appointmentTime: appointment.appointment_time,
        appointmentDateTime: appointmentDateTime.toISOString(),
        now: now.toISOString(),
        millisecondsUntil: millisecondsUntilAppointment,
        hoursUntilAppointment: hoursUntilAppointment.toFixed(2),
        willBlock24h: hoursUntilAppointment < 24,
        willBlockPast: hoursUntilAppointment <= 0,
        userRole: userRole,
        bypassingRestriction: canBypassRestrictions
      });

      // Only apply restrictions for patients (not doctors/admins or the appointment's doctor)
      if (!canBypassRestrictions) {
        // Check if appointment is in the past
        if (hoursUntilAppointment <= 0) {
          return NextResponse.json({
            success: false,
            message: 'Cannot cancel a past appointment',
            code: 'APPOINTMENT_IN_PAST',
            debug: { canBypassRestrictions, isDoctorOrAdmin, isAppointmentDoctor, userRole, userRoleFromDB, userId, doctorId: appointment.doctor_id }
          }, { status: 400 });
        }

        // Block cancellation if less than 24 hours away (patients only)
        if (hoursUntilAppointment < 24) {
          return NextResponse.json({
            success: false,
            message: `Cannot cancel appointment within 24 hours of the scheduled time. Your appointment is in ${hoursUntilAppointment.toFixed(1)} hours. Please contact support for assistance.`,
            code: 'CANCELLATION_TOO_LATE',
            hoursRemaining: hoursUntilAppointment,
            debug: { canBypassRestrictions, isDoctorOrAdmin, isAppointmentDoctor, userRole, userRoleFromDB, userId, doctorId: appointment.doctor_id }
          }, { status: 400 });
        }
      } else {
      }
    }    // Update the appointment status to cancelled
    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || 'Cancelled by doctor',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        message: 'Failed to cancel appointment',
        error: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

