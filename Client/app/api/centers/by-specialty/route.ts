import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Use service role key for production to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(req: Request) {
    try {
        // Check if environment variables are available
        if (!supabaseUrl || !supabaseServiceKey) {
            return NextResponse.json({
                success: false,
                message: "Database connection not available",
                centers: []
            }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const specialty = searchParams.get('specialty');
        const home_visit = searchParams.get('home_visit');


        if (!specialty) {
            return NextResponse.json({
                success: false,
                message: "Specialty parameter is required",
                centers: []
            }, { status: 400 });
        }

        // First, find doctors with the specified specialty
        let doctorQuery = supabaseAdmin
            .from('users')
            .select('id, specialty, home_visits_available')
            .eq('role', 'doctor')
            .eq('specialty', specialty);

        // Only filter for home visit availability if home_visit is explicitly requested
        if (home_visit === 'true') {
            doctorQuery = doctorQuery.eq('home_visits_available', true);
        }

        const { data: doctors, error: doctorError } = await doctorQuery;

        if (doctorError) {
            throw doctorError;
        }

        if (!doctors || doctors.length === 0) {
            return NextResponse.json({
                success: true,
                specialty,
                centers: []
            });
        }

        const doctorIds = doctors.map(d => d.id);

        // Find centers that have these doctors
        const { data: doctorCenters, error: centerError } = await supabaseAdmin
            .from('doctor_centers')
            .select(`
                center_id,
                centers!inner(
                    id,
                    name,
                    name_ar,
                    address,
                    phone,
                    email,
                    services,
                    operating_hours
                )
            `)
            .in('doctor_id', doctorIds);

        if (centerError) {
            throw centerError;
        }

        // Remove duplicates and format the response
        const uniqueCentersMap = new Map();

        doctorCenters?.forEach(dc => {
            const center = dc.centers as any; // Type assertion to handle Supabase nested object
            if (!uniqueCentersMap.has(center.id)) {
                uniqueCentersMap.set(center.id, {
                    id: center.id,
                    name: center.name,
                    name_ar: center.name_ar,
                    address: center.address,
                    phone: center.phone,
                    email: center.email,
                    services: center.services && center.services.length > 0
                        ? center.services
                        : ["General Consultation", "Checkup"], // Default services
                    operating_hours: typeof center.operating_hours === 'string'
                        ? center.operating_hours
                        : '8:00 AM - 6:00 PM', // Convert JSONB object to string or use default
                    doctor_count: 0 // Will be calculated below
                });
            }
        });

        const centers = Array.from(uniqueCentersMap.values());

        // Count doctors per center for this specialty
        for (let center of centers) {
            const { data: doctorCount } = await supabaseAdmin
                .from('doctor_centers')
                .select('doctor_id', { count: 'exact' })
                .eq('center_id', center.id)
                .in('doctor_id', doctorIds);

            center.doctor_count = doctorCount?.length || 0;
        }

        // Filter out centers with no doctors for this specialty
        const centersWithDoctors = centers.filter(c => c.doctor_count > 0);

        return NextResponse.json({
            success: true,
            specialty,
            home_visit: home_visit === 'true',
            centers: centersWithDoctors
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to fetch centers',
            error: error.message
        }, { status: 500 });
    }
}