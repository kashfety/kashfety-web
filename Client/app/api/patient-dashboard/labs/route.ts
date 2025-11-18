import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '12', 10);
        const search = searchParams.get('search') || '';
        const category = searchParams.get('category') || '';

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Calculate offset for pagination
        const offset = (page - 1) * limit;

        // Build base query for centers offering lab or imaging services
        let centersQuery = supabase
            .from('centers')
            .select('id, name, name_ar, address, phone, email, operating_hours, offers_labs, offers_imaging', { count: 'exact' })
            .or('offers_labs.eq.true,offers_imaging.eq.true')
            .order('name', { ascending: true })
            .range(offset, offset + limit - 1);

        // Apply search filter
        if (search) {
            centersQuery = centersQuery.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
        }

        const { data: centers, error: centersError, count } = await centersQuery;

        if (centersError) {
            console.error('Error fetching centers:', centersError);
            return NextResponse.json(
                { success: false, message: 'Failed to fetch centers', error: centersError.message },
                { status: 500 }
            );
        }

        // Fetch available tests for each center
        const centersWithTests = await Promise.all(
            (centers || []).map(async (center) => {
                // Get lab services/tests for this center
                let testsQuery = supabase
                    .from('center_lab_services')
                    .select(`
            lab_test_types:lab_test_type_id (
              id,
              name,
              name_en,
              name_ar,
              name_ku,
              description,
              category,
              default_fee
            )
          `)
                    .eq('center_id', center.id)
                    .eq('is_active', true);

                // Apply category filter if provided
                if (category) {
                    testsQuery = testsQuery.eq('lab_test_types.category', category);
                }

                const { data: services } = await testsQuery;

                // Extract unique tests
                const tests = services
                    ?.map((service: any) => service.lab_test_types)
                    .filter((test: any) => test !== null) || [];

                return {
                    ...center,
                    tests
                };
            })
        );

        // Filter out centers with no tests if category filter is applied
        const filteredCenters = category
            ? centersWithTests.filter(center => center.tests.length > 0)
            : centersWithTests;

        return NextResponse.json({
            success: true,
            centers: filteredCenters,
            total: category ? filteredCenters.length : (count || 0),
            page,
            limit,
            totalPages: Math.ceil((category ? filteredCenters.length : (count || 0)) / limit)
        });
    } catch (error: any) {
        console.error('Unexpected error in labs endpoint:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
