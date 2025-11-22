import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fallback route for Vercel compatibility: /api/doctors-list
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '12', 10);
        const search = searchParams.get('search') || '';
        const specialty = searchParams.get('specialty') || '';

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('users')
            .select('id, name, first_name, last_name, first_name_ar, last_name_ar, name_ar, email, phone, specialty, consultation_fee, rating, experience_years, bio, profile_picture, profile_picture_url, qualifications', { count: 'exact' })
            .eq('role', 'doctor')
            .order('rating', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,first_name_ar.ilike.%${search}%,last_name_ar.ilike.%${search}%,name_ar.ilike.%${search}%,specialty.ilike.%${search}%`);
        }

        // Apply specialty filter
        if (specialty) {
            query = query.ilike('specialty', `%${specialty}%`);
        }

        const { data: doctors, error, count } = await query;

        if (error) {
            console.error('Error fetching doctors:', error);
            return NextResponse.json(
                { success: false, message: 'Failed to fetch doctors', error: error.message },
                { status: 500 }
            );
        }

        // Fetch all specialties to match with doctors
        const { data: specialties } = await supabase
            .from('specialties')
            .select('name, name_en, name_ar, name_ku')
            .eq('is_active', true);

        // Create a map for quick lookup
        const specialtyMap = new Map();
        const specialtySearchMap = new Map(); // Map for Arabic specialty search
        (specialties || []).forEach((spec: any) => {
            specialtyMap.set(spec.name?.toLowerCase(), spec);
            if (spec.name_en) specialtyMap.set(spec.name_en.toLowerCase(), spec);
            // Create reverse mapping for Arabic search
            if (spec.name_ar) {
                const matchingEnglishName = spec.name || spec.name_en;
                if (matchingEnglishName) {
                    specialtySearchMap.set(spec.name_ar.toLowerCase(), matchingEnglishName.toLowerCase());
                }
            }
        });

        // Enrich doctors with specialty translations
        const enrichedDoctors = (doctors || []).map(doctor => {
            const specialtyData = specialtyMap.get(doctor.specialty?.toLowerCase());
            return {
                ...doctor,
                specialty_ar: specialtyData?.name_ar,
                specialty_ku: specialtyData?.name_ku,
                specialty_en: specialtyData?.name_en || doctor.specialty
            };
        });

        // If search query exists, filter enriched doctors to include Arabic specialty matches
        let filteredDoctors = enrichedDoctors;
        if (search) {
            const searchLower = search.toLowerCase();
            filteredDoctors = enrichedDoctors.filter(doctor => {
                // Check if already matched by database query
                const matchedByDB =
                    doctor.name?.toLowerCase().includes(searchLower) ||
                    doctor.first_name?.toLowerCase().includes(searchLower) ||
                    doctor.last_name?.toLowerCase().includes(searchLower) ||
                    doctor.first_name_ar?.toLowerCase().includes(searchLower) ||
                    doctor.last_name_ar?.toLowerCase().includes(searchLower) ||
                    doctor.name_ar?.toLowerCase().includes(searchLower) ||
                    doctor.specialty?.toLowerCase().includes(searchLower);

                // Also check Arabic specialty field
                const matchedByArSpecialty = doctor.specialty_ar?.toLowerCase().includes(searchLower);

                return matchedByDB || matchedByArSpecialty;
            });
        }

        return NextResponse.json({
            success: true,
            doctors: filteredDoctors,
            total: search ? filteredDoctors.length : (count || 0),
            page,
            limit,
            totalPages: search ? Math.ceil(filteredDoctors.length / limit) : Math.ceil((count || 0) / limit)
        });
    } catch (error: any) {
        console.error('Unexpected error in doctors list endpoint:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
