import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
    try {
        // SECURITY: Require authentication
        const authResult = requireAuth(request);
        if (authResult instanceof NextResponse) {
            return authResult; // Returns 401
        }
        const { user } = authResult;
        
        const { searchParams } = new URL(request.url);
        const appointmentId = searchParams.get('appointmentId');
        const { new_date, new_time, reason } = await request.json();

        if (!appointmentId) {
            return NextResponse.json({
                success: false,
                message: 'Appointment ID is required'
            }, { status: 400 });
        }

        if (!new_date || !new_time) {
            return NextResponse.json({
                success: false,
                message: 'New date and time are required'
            }, { status: 400 });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // First, check if the appointment exists and verify ownership
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('id, status, appointment_date, appointment_time, patient_id, doctor_id')
            .eq('id', appointmentId)
            .single();
        
        // SECURITY: Verify user owns this appointment or is the doctor
        if (appointment && user.role === 'patient' && appointment.patient_id !== user.id) {
            return NextResponse.json({
                success: false,
                message: 'Forbidden - You can only reschedule your own appointments'
            }, { status: 403 });
        }
        if (appointment && user.role === 'doctor' && appointment.doctor_id !== user.id) {
            return NextResponse.json({
                success: false,
                message: 'Forbidden - You can only reschedule your own appointments'
            }, { status: 403 });
        }

        if (fetchError || !appointment) {
            return NextResponse.json({
                success: false,
                message: 'Appointment not found'
            }, { status: 404 });
        }

        // Check if appointment is already cancelled
        if (appointment.status === 'cancelled') {
            return NextResponse.json({
                success: false,
                message: 'Cannot reschedule a cancelled appointment'
            }, { status: 400 });
        }

        // Update the appointment with new date and time
        const { data: updatedAppointment, error: updateError } = await supabase
            .from('appointments')
            .update({
                appointment_date: new_date,
                appointment_time: new_time,
                notes: reason ? `Rescheduled: ${reason}` : 'Rescheduled by patient',
                updated_at: new Date().toISOString()
            })
            .eq('id', appointmentId)
            .select('*')
            .single();

        if (updateError) {
            return NextResponse.json({
                success: false,
                message: 'Failed to reschedule appointment',
                error: updateError.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: 'Appointment rescheduled successfully',
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
