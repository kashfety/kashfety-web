import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    // Get all services for this center
    const { data: services, error } = await supabase
      .from('center_lab_services')
      .select(`
        id,
        lab_test_type_id,
        base_fee,
        is_active,
        created_at,
        updated_at,
        lab_test_types (
          id,
          name,
          category,
          code,
          default_fee,
          description,
          default_duration
        )
      `)
      .eq('center_id', centerId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    // Transform the data to match expected format
    const transformedServices = services?.map(service => {
      const testType = Array.isArray(service.lab_test_types) 
        ? service.lab_test_types[0] 
        : service.lab_test_types;
      
      return {
        id: service.id,
        test_type_id: service.lab_test_type_id,
        active: service.is_active,
        fee: service.base_fee,
        description: testType?.description,
        duration: testType?.default_duration || 30,
        requirements: '' // Add if needed in schema
      };
    }) || [];

    return NextResponse.json({ success: true, services: transformedServices });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
