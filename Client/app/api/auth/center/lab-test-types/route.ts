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
      return NextResponse.json({
        error: 'Failed to fetch test types',
        details: error.message
      }, { status: 500 });
    }

    ));

    // Get center's current services
    const centerId = user.center_id || user.id;
    const { data: centerServices, error: servicesError } = await supabase
      .from('center_lab_services')
      .select('lab_test_type_id, base_fee, is_active')
      .eq('center_id', centerId);

    if (servicesError) {
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
      code: testType.code, // Include code
      // Add current service settings if they exist
      base_fee: servicesMap[testType.id]?.base_fee || testType.default_fee || 0,
      is_active: servicesMap[testType.id]?.is_active || false
    }));

    ));

    return NextResponse.json({
      success: true,
      labTestTypes: testTypesWithServices,
      totalTypes: allTestTypes.length,
      activeServices: centerServices?.filter(s => s.is_active).length || 0
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { code, name, category, default_fee } = body;

    // Validate required fields
    if (!code || !name || !category) {
      return NextResponse.json({
        error: 'Missing required fields',
        details: 'code, name, and category are required'
      }, { status: 400 });
    }

    // Validate category
    if (category !== 'lab' && category !== 'imaging') {
      return NextResponse.json({
        error: 'Invalid category',
        details: 'category must be either "lab" or "imaging"'
      }, { status: 400 });
    }

    // Check if test type with same code already exists
    const { data: existing, error: checkError } = await supabase
      .from('lab_test_types')
      .select('id, code')
      .eq('code', code.toUpperCase())
      .single();

    if (existing) {
      return NextResponse.json({
        error: 'Test type already exists',
        details: `A test type with code "${code.toUpperCase()}" already exists`
      }, { status: 409 });
    }

    // Create new lab test type
    const { data: newTestType, error: insertError } = await supabase
      .from('lab_test_types')
      .insert({
        code: code.toUpperCase(),
        name: name.trim(),
        category,
        default_fee: default_fee ? Number(default_fee) : null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        error: 'Failed to create lab test type',
        details: insertError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lab test type created successfully',
      data: newTestType
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
