import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fallback route for Vercel compatibility: /api/doctor-details?doctorId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const doctorId = searchParams.get('doctorId');

        if (!doctorId) {
            return NextResponse.json(
                { success: false, message: 'Doctor ID is required' },
                { status: 400 }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch doctor details
        const { data: doctor, error: doctorError } = await supabase
            .from('users')
            .select('id, name, first_name, last_name, email, phone, specialty, consultation_fee, rating, experience_years, bio, profile_picture, qualifications')
            .eq('id', doctorId)
            .eq('role', 'doctor')
            .single();

        if (doctorError || !doctor) {
            console.error('Error fetching doctor:', doctorError);
            return NextResponse.json(
                { success: false, message: 'Doctor not found' },
                { status: 404 }
            );
        }

        // Fetch associated centers
        const { data: doctorCenters, error: centersError } = await supabase
            .from('doctor_centers')
            .select(`
                center_id,
                centers (
                    id,
                    name,
                    address,
                    phone
                )
            `)
            .eq('doctor_id', doctorId);

        if (centersError) {
            console.error('Error fetching doctor centers:', centersError);
            // Continue without centers data
        }

        // Extract centers from the join result
        const centers = doctorCenters
            ? doctorCenters
                .map(dc => dc.centers)
                .filter(Boolean)
                .map((center: any) => ({
                    id: center.id,
                    name: center.name,
                    address: center.address,
                    phone: center.phone
                }))
            : [];

        return NextResponse.json({
            success: true,
            doctor: {
                ...doctor,
                centers
            }
        });
    } catch (error: any) {
        console.error('Unexpected error in doctor details endpoint:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
