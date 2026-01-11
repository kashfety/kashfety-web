import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * PUBLIC ENDPOINT - No authentication required
 * 
 * This endpoint is intentionally public to allow users to browse available lab test types
 * before booking. This is necessary for the booking flow where users need to see
 * available test options before authentication.
 * 
 * Note: The frontend primarily uses /api/public/lab-tests/types, but this endpoint
 * is kept for backward compatibility and direct access.
 */
export async function GET(request: NextRequest) {
  try {
    // Get only test types that have active center services
    const { data: typesWithCenters, error } = await supabase
      .from('lab_test_types')
      .select(`
        *,
        center_lab_services!inner(center_id, is_active)
      `)
      .eq('center_lab_services.is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch test types' }, { status: 500 });
    }

    // Remove duplicates and clean up the response
    const uniqueTypes = new Map();
    typesWithCenters?.forEach((type: any) => {
      if (!uniqueTypes.has(type.id)) {
        const { center_lab_services, ...cleanType } = type;
        uniqueTypes.set(type.id, cleanType);
      }
    });

    const types = Array.from(uniqueTypes.values());

    return NextResponse.json({ 
      success: true,
      types: types || [] 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
