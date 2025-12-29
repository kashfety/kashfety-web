import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for production to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const { centerId } = await params;

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    // Get active services for this center with test type details and actual fees (public access)
    const { data: services, error } = await supabase
      .from('center_lab_services')
      .select(`
        lab_test_type_id,
        base_fee,
        is_active,
        lab_test_types(id, name, description, category, default_fee)
      `)
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('lab_test_types(name)');

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      services: services || []
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
