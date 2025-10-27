import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        console.log('POST /api/appointments/book - Request received');
        
        const body = await req.json();
        console.log('Request body:', body);
        
        const { 
            patient_id, 
            doctor_id, 
            appointment_date, 
            appointment_time, 
            appointment_type, 
            consultation_fee,
            center_id 
        } = body;

        // Validate required fields
        if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
            console.log('Missing required fields:', { patient_id, doctor_id, appointment_date, appointment_time });
            return NextResponse.json({
                success: false,
                message: "Missing required fields"
            }, { status: 400 });
        }

        console.log('Checking for existing appointment...');
        // Block slot if already scheduled or confirmed
        const { data: existing } = await supabaseAdmin
            .from('appointments')
            .select('id, status, center_id')
            .eq('doctor_id', doctor_id)
            .eq('appointment_date', appointment_date)
            .eq('appointment_time', appointment_time)
            .in('status', ['scheduled', 'confirmed'])
            .maybeSingle();

        if (existing) {
            // If center_id is provided on the request, enforce center-aware conflict.
            // If existing.center_id is null (legacy), still treat as conflict to avoid double booking.
            if (!center_id || !existing.center_id || existing.center_id === center_id) {
                console.log('Time slot already taken (center-aware):', existing);
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
            appointment_type: appointment_type || 'Clinic',
            consultation_fee: consultation_fee || null,
            status: 'scheduled'
        } as any;

        const { data, error } = await supabaseAdmin
            .from('appointments')
            .insert(appointmentData)
            .select('*')
            .single();

        if (error) throw error;

        console.log('Appointment created:', data);
        return NextResponse.json({
            success: true,
            message: 'Appointment booked successfully',
            appointment: data
        });

    } catch (error: any) {
        console.error('Error booking appointment:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to book appointment'
        }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const doctorId = searchParams.get('doctor_id');
        const date = searchParams.get('date');

        if (!doctorId || !date) {
            return NextResponse.json({
                success: false,
                message: "Missing doctor_id or date parameter"
            }, { status: 400 });
        }

        // Get existing appointments for the doctor on the specified date
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select('appointment_time')
            .eq('doctor_id', doctorId)
            .eq('appointment_date', date)
            .in('status', ['scheduled', 'confirmed']);

        if (error) {
            throw error;
        }

        const bookedTimes = appointments?.map(apt => apt.appointment_time) || [];

        return NextResponse.json({
            success: true,
            bookedTimes
        });

    } catch (error: any) {
        console.error('Error fetching appointments:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to fetch appointments'
        }, { status: 500 });
    }
}
