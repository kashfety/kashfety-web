import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const labTestTypeId = searchParams.get('lab_test_type_id');
    const category = searchParams.get('category');

    // Get all centers that have active lab services
    let query = supabase
      .from('center_lab_services')
      .select(`
        center_id,
        lab_test_type_id,
        base_fee,
        is_active,
        centers(id, name, address, phone, email),
        lab_test_types(id, name, description, category, default_fee)
      `)
      .eq('is_active', true);

    // Filter by specific test type if provided
    if (labTestTypeId) {
      query = query.eq('lab_test_type_id', labTestTypeId);
    }

    // Filter by category if provided (lab or imaging)
    if (category) {
      query = query.eq('lab_test_types.category', category);
    }

    const { data: services, error } = await query;

    if (error) {
      console.error('Failed to fetch centers with services:', error);
      return NextResponse.json({ error: 'Failed to fetch centers' }, { status: 500 });
    }

    // Group services by center
    const centersMap = new Map();
    
    services?.forEach((service: any) => {
      const center = service.centers;
      const centerId = center?.id;
      
      if (!centerId) return; // Skip if no center data
      
      if (!centersMap.has(centerId)) {
        centersMap.set(centerId, {
          id: center.id,
          name: center.name,
          address: center.address,
          phone: center.phone,
          email: center.email,
          services: []
        });
      }

      centersMap.get(centerId).services.push({
        lab_test_type_id: service.lab_test_type_id,
        base_fee: service.base_fee,
        lab_test_types: service.lab_test_types
      });
    });

    const centers = Array.from(centersMap.values());

    return NextResponse.json({
      success: true,
      centers,
      totalCenters: centers.length
    });

  } catch (error) {
    console.error('Centers API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
