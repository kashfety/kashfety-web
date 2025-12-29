import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const centerId = searchParams.get('centerId');

    if (!centerId) {
      return NextResponse.json({ success: false, error: 'Center ID is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get active services for this center with test type details and actual fees (public access)
    const { data: services, error } = await supabase
      .from('center_lab_services')
      .select(`
        lab_test_type_id,
        base_fee,
        is_active,
        lab_test_types(id, name, name_en, name_ar, name_ku, description, category, default_fee)
      `)
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('lab_test_types(name)');

    if (error) {
      return NextResponse.json({ success: false, error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      services: services || []
    });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

