import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🏥 [Admin Specialties] Request received');

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all specialties ordered by display_order
    const { data: specialties, error } = await supabase
      .from('specialties')
      .select('*')
      .order('display_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch specialties:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch specialties',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Admin Specialties] Fetched', specialties.length, 'specialties');

    return NextResponse.json({
      success: true,
      data: {
        specialties: specialties || []
      }
    });

  } catch (error: any) {
    console.error('❌ Admin specialties API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
