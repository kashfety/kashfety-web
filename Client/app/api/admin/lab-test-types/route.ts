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
      console.error('Error fetching lab test types:', error);
      throw new Error(error.message || 'Failed to fetch lab test types');
    }

    return NextResponse.json({
      success: true,
      labTestTypes: labTestTypes || []
    });

  } catch (error: any) {
    console.error('❌ [Lab Test Types] GET error:', error);
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
    console.log('📥 [Lab Test Types] POST request body:', body);

    const { name, name_ar } = body;

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

    // Insert new lab test type
    const { data: newLabTestType, error } = await supabase
      .from('lab_test_types')
      .insert([
        {
          name: name.trim(),
          name_ar: name_ar.trim(),
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating lab test type:', error);
      throw new Error(error.message || 'Failed to create lab test type');
    }

    console.log('✅ [Lab Test Types] Created successfully:', newLabTestType.id);

    return NextResponse.json({
      message: 'Lab test type created successfully',
      success: true,
      labTestType: newLabTestType
    });

  } catch (error: any) {
    console.error('❌ [Lab Test Types] POST error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}
