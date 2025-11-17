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
            .select('id, name, first_name, last_name, email, phone, specialty, consultation_fee, rating, experience_years, bio, profile_picture, qualifications', { count: 'exact' })
            .eq('role', 'doctor')
            .order('rating', { ascending: false })
            .range(offset, offset + limit - 1);

        // Apply search filter
        if (search) {
            query = query.or(`name.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,specialty.ilike.%${search}%`);
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

        return NextResponse.json({
            success: true,
            doctors: doctors || [],
            total: count || 0,
            page,
            limit,
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error: any) {
        console.error('Unexpected error in doctors list endpoint:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
