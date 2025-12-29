import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for production to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    // Get only test types that have active center services (public access)
    const { data: typesWithCenters, error } = await supabase
      .from('lab_test_types')
      .select(`
        *,
        center_lab_services!inner(center_id, is_active)
      `)
      .eq('center_lab_services.is_active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch test types' }, { status: 500 });
    }

    // Remove duplicates and clean up the response
    const uniqueTypes = new Map();
    typesWithCenters?.forEach((type: any) => {
      if (!uniqueTypes.has(type.id)) {
        const { center_lab_services, ...cleanType } = type;
        uniqueTypes.set(type.id, cleanType);
      }
    });

    const types = Array.from(uniqueTypes.values());

    return NextResponse.json({ 
      success: true,
      types: types || [] 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
