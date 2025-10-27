import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getUserFromAuth } from '../utils/jwt-auth';export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Fetch ALL test types (both lab and imaging) from database
    const { data: allTestTypes, error } = await supabase
      .from('lab_test_types')
      .select('*')
      .order('name');

    if (error) {
      console.error('Failed to fetch test types:', error);
      return NextResponse.json({
        error: 'Failed to fetch test types',
        details: error.message
      }, { status: 500 });
    }

    // Get center's current services
    const centerId = user.center_id || user.id;
    const { data: centerServices, error: servicesError } = await supabase
      .from('center_lab_services')
      .select('lab_test_type_id, base_fee, is_active')
      .eq('center_id', centerId);

    if (servicesError) {
      console.error('Failed to fetch center services:', servicesError);
      // Don't fail the request, just return empty services
    }

    // Map services by lab_test_type_id for easy lookup
    const servicesMap: Record<string, { base_fee: number; is_active: boolean }> = {};
    if (centerServices) {
      centerServices.forEach(service => {
        servicesMap[service.lab_test_type_id] = {
          base_fee: service.base_fee,
          is_active: service.is_active
        };
      });
    }

    // Combine all test types (lab + imaging) with current service settings
    const testTypesWithServices = allTestTypes.map(testType => ({
      id: testType.id,
      name: testType.name,
      description: testType.description,
      category: testType.category,
      default_fee: testType.default_fee,
      // Add current service settings if they exist
      base_fee: servicesMap[testType.id]?.base_fee || testType.default_fee || 0,
      is_active: servicesMap[testType.id]?.is_active || false
    }));

    return NextResponse.json({
      success: true,
      labTestTypes: testTypesWithServices,
      totalTypes: allTestTypes.length,
      activeServices: centerServices?.filter(s => s.is_active).length || 0
    });

  } catch (error) {
    console.error('Lab test types API error:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
