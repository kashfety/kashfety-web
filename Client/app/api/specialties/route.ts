import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Use service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 Fetching medical specialties');

    const { data: specialties, error } = await supabase
      .from('specialties')
      .select('id, name, description')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Error fetching specialties:', error);
      return NextResponse.json(
        { error: 'Failed to fetch specialties' },
        { status: 500 }
      );
    }

    console.log(`✅ Found ${specialties?.length || 0} active specialties`);

    return NextResponse.json({
      success: true,
      specialties: specialties || [],
      count: specialties?.length || 0
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
