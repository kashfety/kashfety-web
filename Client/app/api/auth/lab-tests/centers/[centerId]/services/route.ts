import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ centerId: string }> }
) {
  try {
    const { centerId } = await params;

    if (!centerId) {
      return NextResponse.json({ error: 'Center ID is required' }, { status: 400 });
    }

    // Get active services for this center with test type details and actual fees
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
      console.error('Failed to fetch center services:', error);
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      services: services || []
    });

  } catch (error) {
    console.error('Center services API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
