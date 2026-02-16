import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserFromAuth } from '../utils/jwt-auth';
import { validateCenterExists } from '../utils/center-validation';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase configuration');
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const centerId = user.center_id || user.id;
    const centerValidation = await validateCenterExists(centerId);
    if (!centerValidation.exists) {
      return NextResponse.json({
        error: centerValidation.error || 'Center not found',
        labTestTypes: [],
        totalTypes: 0,
        activeServices: 0
      }, { status: 404 });
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

    // Get center's current services
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
    const safeTypes = allTestTypes || [];
    const testTypesWithServices = safeTypes.map(testType => ({
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

    return NextResponse.json({
      success: true,
      labTestTypes: testTypesWithServices,
      totalTypes: safeTypes.length,
      activeServices: centerServices?.filter(s => s.is_active).length || 0
    });

  } catch (error) {
    console.error('GET /api/auth/center/lab-test-types failed:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdminClient();
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const centerId = user.center_id || user.id;
    const centerValidation = await validateCenterExists(centerId);
    if (!centerValidation.exists) {
      return NextResponse.json({
        error: centerValidation.error || 'Center not found'
      }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, name_en, name_ar, category, default_fee } = body;
    const normalizedCode = String(code || '').trim().toUpperCase();
    const normalizedName = String(name || '').trim();
    const normalizedNameEn = String(name_en || '').trim();
    const normalizedNameAr = String(name_ar || '').trim();
    const parsedDefaultFee = default_fee !== undefined && default_fee !== null && default_fee !== ''
      ? Number(default_fee)
      : null;

    // Validate required fields
    if (!normalizedCode || !normalizedName || !category) {
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

    if (parsedDefaultFee !== null && Number.isNaN(parsedDefaultFee)) {
      return NextResponse.json({
        error: 'Invalid default_fee',
        details: 'default_fee must be a valid number'
      }, { status: 400 });
    }

    const normalizedNameLower = normalizedName.toLowerCase();
    const normalizedNameEnLower = normalizedNameEn.toLowerCase();
    const normalizedNameArLower = normalizedNameAr.toLowerCase();

    // Check if test type with same code already exists
    const { data: existing, error: checkError } = await supabase
      .from('lab_test_types')
      .select('id, code')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (checkError) {
      console.error('Failed checking duplicate lab test type code:', checkError);
      return NextResponse.json({
        error: 'Failed to validate test type code'
      }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({
        error: 'Test type already exists',
        details: `A test type with code "${normalizedCode}" already exists`,
        conflictField: 'code'
      }, { status: 409 });
    }

    // Check duplicate naming conflicts (case-insensitive) across default/en/ar names
    const { data: allTypes, error: allTypesError } = await supabase
      .from('lab_test_types')
      .select('id, name, name_en, name_ar');

    if (allTypesError) {
      console.error('Failed checking duplicate lab test type names:', allTypesError);
      return NextResponse.json({
        error: 'Failed to validate test type name'
      }, { status: 500 });
    }

    const hasNameConflict = (row: any) => {
      const rowName = String(row.name || '').trim().toLowerCase();
      const rowNameEn = String(row.name_en || '').trim().toLowerCase();
      const rowNameAr = String(row.name_ar || '').trim().toLowerCase();

      if (normalizedNameLower && (rowName === normalizedNameLower || rowNameEn === normalizedNameLower || rowNameAr === normalizedNameLower)) {
        return { conflictField: 'name', conflictValue: normalizedName };
      }
      if (normalizedNameEnLower && (rowName === normalizedNameEnLower || rowNameEn === normalizedNameEnLower || rowNameAr === normalizedNameEnLower)) {
        return { conflictField: 'name_en', conflictValue: normalizedNameEn };
      }
      if (normalizedNameArLower && (rowName === normalizedNameArLower || rowNameEn === normalizedNameArLower || rowNameAr === normalizedNameArLower)) {
        return { conflictField: 'name_ar', conflictValue: normalizedNameAr };
      }

      return null;
    };

    const conflict = (allTypes || []).map(hasNameConflict).find(Boolean) as { conflictField: 'name' | 'name_en' | 'name_ar'; conflictValue: string } | undefined;

    if (conflict) {
      return NextResponse.json({
        error: 'Test type name already exists',
        details: `A test type with this name already exists: "${conflict.conflictValue}"`,
        conflictField: conflict.conflictField
      }, { status: 409 });
    }

    // Create new lab test type
    const { data: newTestType, error: insertError } = await supabase
      .from('lab_test_types')
      .insert({
        code: normalizedCode,
        name: normalizedName,
        name_en: normalizedNameEn || normalizedName,
        name_ar: normalizedNameAr || null,
        category,
        default_fee: parsedDefaultFee,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: 'Test type already exists',
          details: `A test type with code "${normalizedCode}" already exists`,
          conflictField: 'code'
        }, { status: 409 });
      }

      console.error('Failed creating center lab test type:', insertError);
      return NextResponse.json({
        error: 'Failed to create lab test type'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Lab test type created successfully',
      data: newTestType
    }, { status: 201 });

  } catch (error: any) {
    console.error('POST /api/auth/center/lab-test-types failed:', error);
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 });
  }
}
