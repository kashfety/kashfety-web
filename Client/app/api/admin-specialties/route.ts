import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Require admin or super_admin role
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch specialties',
        details: error.message 
      }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      data: {
        specialties: specialties || []
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
