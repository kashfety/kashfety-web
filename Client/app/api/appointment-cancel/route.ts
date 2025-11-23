import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    const { reason } = await request.json();

    console.log('📅 [Appointment Cancel] Request:', { appointmentId, reason });

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
        const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

        if (authError) {
          console.log('⚠️ Auth error:', authError);
        }

        if (user) {
          userId = user.id;
          // Try multiple sources for role
          userRole = user.user_metadata?.role || user.app_metadata?.role || user.role;
          console.log('👤 [Appointment Cancel] User details:', {
            userId: user.id,
            email: user.email,
            role: userRole,
            user_metadata: user.user_metadata,
            app_metadata: user.app_metadata
          });

          // Fetch user role from database instead of relying on token metadata
          if (userId) {
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('role')
              .eq('id', userId)
              .single();

            if (!userError && userData) {
              userRoleFromDB = userData.role;
              console.log('✅ [Appointment Cancel] Fetched role from database:', userRoleFromDB);
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not determine user from token:', error);
      }
    } else {
      console.log('⚠️ No authorization header provided');
    }

    // Use database role instead of token role
    userRole = userRoleFromDB || userRole;

    // First, check if the appointment exists and get doctor_id
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time, doctor_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      console.error('❌ Appointment not found:', fetchError);
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
        console.log('⚠️ [Appointment Cancel] User does NOT have bypass privileges - applying restrictions');
        // Check if appointment is in the past
        if (hoursUntilAppointment <= 0) {
          console.log('❌ [Appointment Cancel] Blocking: appointment is in the past');
          return NextResponse.json({
            success: false,
            message: 'Cannot cancel a past appointment',
            code: 'APPOINTMENT_IN_PAST',
            debug: { canBypassRestrictions, isDoctorOrAdmin, isAppointmentDoctor, userRole, userRoleFromDB, userId, doctorId: appointment.doctor_id }
          }, { status: 400 });
        }

        // Block cancellation if less than 24 hours away (patients only)
        if (hoursUntilAppointment < 24) {
          console.log('❌ [Appointment Cancel] Blocking: within 24 hours');
          return NextResponse.json({
            success: false,
            message: `Cannot cancel appointment within 24 hours of the scheduled time. Your appointment is in ${hoursUntilAppointment.toFixed(1)} hours. Please contact support for assistance.`,
            code: 'CANCELLATION_TOO_LATE',
            hoursRemaining: hoursUntilAppointment,
            debug: { canBypassRestrictions, isDoctorOrAdmin, isAppointmentDoctor, userRole, userRoleFromDB, userId, doctorId: appointment.doctor_id }
          }, { status: 400 });
        }
      } else {
        console.log('✅ [Appointment Cancel] User authorized to bypass time restrictions');
      }
    }    // Update the appointment status to cancelled
    console.log('💾 Cancelling appointment...');
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
      console.error('❌ Failed to cancel appointment:', updateError);
      return NextResponse.json({
        success: false,
        message: 'Failed to cancel appointment',
        error: updateError.message
      }, { status: 500 });
    }

    console.log('✅ [Appointment Cancel] Appointment cancelled successfully');
    return NextResponse.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment: updatedAppointment
    });

  } catch (error: any) {
    console.error('❌ Appointment cancel error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

