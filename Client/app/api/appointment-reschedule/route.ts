import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const appointmentId = searchParams.get('appointmentId');
        const { new_date, new_time, reason } = await request.json();

        console.log('📅 [Appointment Reschedule] Request:', { appointmentId, new_date, new_time });

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

        // First, check if the appointment exists
        const { data: appointment, error: fetchError } = await supabase
            .from('appointments')
            .select('id, status, appointment_date, appointment_time')
            .eq('id', appointmentId)
            .single();

        if (fetchError || !appointment) {
            console.error('❌ Appointment not found:', fetchError);
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
        console.log('💾 Rescheduling appointment...');
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
            console.error('❌ Failed to reschedule appointment:', updateError);
            return NextResponse.json({
                success: false,
                message: 'Failed to reschedule appointment',
                error: updateError.message
            }, { status: 500 });
        }

        console.log('✅ [Appointment Reschedule] Appointment rescheduled successfully');
        return NextResponse.json({
            success: true,
            message: 'Appointment rescheduled successfully',
            appointment: updatedAppointment
        });

    } catch (error: any) {
        console.error('❌ Appointment reschedule error:', error);
        return NextResponse.json({
            success: false,
            message: 'Internal server error',
            error: error.message
        }, { status: 500 });
    }
}
