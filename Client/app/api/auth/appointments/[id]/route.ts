import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Use service role key for admin operations
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);
const AUTH_FALLBACK_ENABLED = process.env.AUTH_FALLBACK_ENABLED !== '0';

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const authHeader = request.headers.get('authorization');
        if (!authHeader && !AUTH_FALLBACK_ENABLED) {
            return NextResponse.json({ success: false, message: 'Authorization header required' }, { status: 401 });
        }
        const { id } = params;
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role') || 'patient';


        if (!id) {
            return NextResponse.json({
                success: false,
                message: 'User ID is required'
            }, { status: 400 });
        }

        // Fetch appointments with doctor, patient, and optional center information
        const { data: appointments, error } = await supabaseAdmin
            .from('appointments')
            .select(`
                *,
                doctor:users!appointments_doctor_id_fkey (
                    id,
                    name,
                    specialty,
                    phone
                ),
                patient:users!appointments_patient_id_fkey (
                    id,
                    name,
                    phone,
                    email
                ),
                center:centers!appointments_center_id_fkey (
                    id,
                    name,
                    address
                )
            `)
            .eq(role === 'doctor' ? 'doctor_id' : 'patient_id', id)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({
                success: false,
                message: 'Failed to fetch appointments',
                error: error.message
            }, { status: 500 });
        }

        // Provide flat center_name/address fallbacks for clients not reading nested center
        const enriched = (appointments || []).map((a: any) => ({
            ...a,
            center_name: a.center?.name || a.center_name || null,
            center_address: a.center?.address || a.center_address || null,
            doctor_specialty: a.doctor?.specialty || a.doctor_specialty || a.specialty || null
        }));


        return NextResponse.json({
            success: true,
            appointments: enriched,
            message: `Found ${enriched.length || 0} appointments`
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: 'Internal server error',
            error: error.message
        }, { status: 500 });
    }
}
