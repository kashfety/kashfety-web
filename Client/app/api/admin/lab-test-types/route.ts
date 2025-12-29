import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

// GET - Fetch all lab test types
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: labTestTypes, error } = await supabase
      .from('lab_test_types')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Failed to fetch lab test types');
    }

    return NextResponse.json({
      success: true,
      labTestTypes: labTestTypes || []
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}

// POST - Add a new lab test type
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { 
      name, 
      name_ar, 
      name_ku, 
      category, 
      description, 
      code,
      default_duration,
      default_fee,
      display_order
    } = body;

    // Validate required fields
    if (!name || !name_ar) {
      return NextResponse.json(
        { error: 'Both English and Arabic names are required', success: false },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if test type already exists (case-insensitive)
    const { data: existing } = await supabase
      .from('lab_test_types')
      .select('id, name, name_ar')
      .or(`name.ilike.${name},name_ar.eq.${name_ar}`)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Lab test type already exists', success: false },
        { status: 400 }
      );
    }

    // Prepare lab test type data
    const labTestData: any = {
      name: name.trim(),
      name_ar: name_ar.trim(),
      category: category || 'lab',
      is_active: true,
      default_duration: default_duration || 30,
      default_fee: default_fee || 0,
      display_order: display_order || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Add optional fields if provided
    if (name_ku) labTestData.name_ku = name_ku.trim();
    if (description) labTestData.description = description.trim();
    if (code) labTestData.code = code.trim();

    // Insert new lab test type
    const { data: newLabTestType, error } = await supabase
      .from('lab_test_types')
      .insert([labTestData])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || 'Failed to create lab test type');
    }


    return NextResponse.json({
      message: 'Lab test type created successfully',
      success: true,
      labTestType: newLabTestType
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}

// DELETE - Delete a lab test type (using query parameter instead of dynamic route)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');


    if (!id) {
      return NextResponse.json(
        { error: 'Lab test type ID is required', success: false },
        { status: 400 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if the lab test type is in use
    const { data: labBookings, error: bookingsCheckError } = await supabase
      .from('lab_bookings')
      .select('id')
      .eq('lab_test_type_id', id)
      .limit(1);

    if (bookingsCheckError) {
      throw new Error('Failed to check if lab test type is in use');
    }

    if (labBookings && labBookings.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete lab test type that is being used in lab bookings. Please archive it instead or contact support.',
          success: false,
          inUse: true
        },
        { status: 400 }
      );
    }

    // Check if the lab test type is used in center_lab_services
    const { data: centerServices, error: servicesCheckError } = await supabase
      .from('center_lab_services')
      .select('id')
      .eq('lab_test_type_id', id)
      .limit(1);

    if (servicesCheckError) {
      throw new Error('Failed to check if lab test type is in use');
    }

    if (centerServices && centerServices.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete lab test type that is configured in center services. Please remove it from all centers first.',
          success: false,
          inUse: true
        },
        { status: 400 }
      );
    }

    // Check if the lab test type is used in center_lab_schedules
    const { data: centerSchedules, error: schedulesCheckError } = await supabase
      .from('center_lab_schedules')
      .select('id')
      .eq('lab_test_type_id', id)
      .limit(1);

    if (schedulesCheckError) {
      throw new Error('Failed to check if lab test type is in use');
    }

    if (centerSchedules && centerSchedules.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot delete lab test type that is configured in center schedules. Please remove it from all centers first.',
          success: false,
          inUse: true
        },
        { status: 400 }
      );
    }

    // If not in use anywhere, proceed with deletion
    const { error } = await supabase
      .from('lab_test_types')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message || 'Failed to delete lab test type');
    }


    return NextResponse.json({
      message: 'Lab test type deleted successfully',
      success: true
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}
