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
            .select('id, name, first_name, last_name, first_name_ar, last_name_ar, name_ar, email, phone, specialty, consultation_fee, rating, experience_years, bio, profile_picture, qualifications')
            .eq('id', doctorId)
            .eq('role', 'doctor')
            .single();

        if (doctorError || !doctor) {
            return NextResponse.json(
                { success: false, message: 'Doctor not found' },
                { status: 404 }
            );
        }

        // Fetch specialty translation
        const { data: specialtyData } = await supabase
            .from('specialties')
            .select('name, name_en, name_ar, name_ku')
            .or(`name.ilike.${doctor.specialty},name_en.ilike.${doctor.specialty}`)
            .eq('is_active', true)
            .limit(1)
            .single();

        // Enrich doctor with specialty translations
        if (specialtyData) {
            doctor.specialty_ar = specialtyData.name_ar;
            doctor.specialty_ku = specialtyData.name_ku;
            doctor.specialty_en = specialtyData.name_en || doctor.specialty;
        }

        // Fetch associated centers
        const { data: doctorCenters, error: centersError } = await supabase
            .from('doctor_centers')
            .select(`
                center_id,
                centers (
                    id,
                    name,
                    name_ar,
                    address,
                    phone
                )
            `)
            .eq('doctor_id', doctorId);

        if (centersError) {
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
                    name_ar: center.name_ar,
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
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
