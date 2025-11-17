import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Fallback route for Vercel compatibility: /api/lab-details?centerId=xxx
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const centerId = searchParams.get('centerId');

        if (!centerId) {
            return NextResponse.json(
                { success: false, message: 'Center ID is required' },
                { status: 400 }
            );
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Fetch center details
        const { data: center, error: centerError } = await supabase
            .from('centers')
            .select('*')
            .eq('id', centerId)
            .single();

        if (centerError || !center) {
            console.error('Error fetching center:', centerError);
            return NextResponse.json(
                { success: false, message: 'Center not found' },
                { status: 404 }
            );
        }

        // Fetch available tests for this center
        const { data: services, error: servicesError } = await supabase
            .from('center_lab_services')
            .select(`
        base_fee,
        lab_test_types:lab_test_type_id (
          id,
          name,
          description,
          category,
          default_fee
        )
      `)
            .eq('center_id', centerId)
            .eq('is_active', true);

        if (servicesError) {
            console.error('Error fetching services:', servicesError);
        }

        // Extract tests with fees
        const tests = services?.map((service: any) => ({
            ...service.lab_test_types,
            // Use base_fee from center_lab_services if available, otherwise use default_fee
            default_fee: service.base_fee || service.lab_test_types?.default_fee
        })).filter((test: any) => test !== null) || [];

        const centerWithTests = {
            ...center,
            tests
        };

        return NextResponse.json({
            success: true,
            center: centerWithTests
        });
    } catch (error: any) {
        console.error('Unexpected error in lab details endpoint:', error);
        return NextResponse.json(
            { success: false, message: 'Internal server error', error: error.message },
            { status: 500 }
        );
    }
}
