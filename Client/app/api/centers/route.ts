import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// For now, use the anon key - in production you'd want the service role key
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(req: Request) {
    try {
        // Check if environment variables are available
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            return NextResponse.json({
                success: false,
                message: "Database connection not available",
                centers: []
            }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const service = searchParams.get('service');

        let query = supabaseAdmin
            .from('centers')
            .select(`
                id,
                name,
                address,
                phone,
                email,
                services,
                operating_hours
            `);

        if (service) {
            query = query.contains('services', [service]);
        }

        const { data: centers, error } = await query;

        if (error) throw error;

        // Format the response with mock pricing
        const formattedCenters = centers?.map(center => ({
            id: center.id,
            name: center.name,
            address: center.address,
            phone: center.phone,
            services: center.services && center.services.length > 0 
                ? center.services 
                : ["Blood Tests", "X-Ray", "Ultrasound", "CT Scan", "MRI", "ECG", "Basic Health Package"], // Default services if none in DB
            openHours: typeof center.operating_hours === 'string' 
                ? center.operating_hours 
                : '8:00 AM - 6:00 PM', // Convert JSONB object to string or use default
            rating: 4.5, // Mock rating since not in schema
            reviews: 50, // Mock review count since not in schema
            pricing: {
                "Blood Tests": 50,
                "X-Ray": 80,
                "Ultrasound": 120,
                "CT Scan": 300,
                "MRI": 600,
                "ECG": 70,
                "Basic Health Package": 200
            }
        }));

        return NextResponse.json({
            success: true,
            centers: formattedCenters
        });

    } catch (error: any) {
        console.error('Error fetching centers:', error);
        return NextResponse.json({
            success: false,
            message: error.message || 'Failed to fetch medical centers'
        }, { status: 500 });
    }
}
