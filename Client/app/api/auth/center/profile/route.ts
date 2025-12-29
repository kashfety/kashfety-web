import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  // Require center authentication even in fallback mode
  const authResult = requireCenter(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403 error
  }
  const { user } = authResult;

  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/profile`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      // fall back to supabase
    }
  }

  // Supabase fallback: requires authentication (already verified above)
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  
  try {
    // Use center_id from authenticated user
    const centerId = user.center_id || searchParams.get('center_id');
    
    if (!centerId) {
      return NextResponse.json({ center: null, message: 'No center record found' });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First check if center exists
    const { data: center, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId);

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch center profile' }, { status: 500 });
    }

    // If no center found, return null profile (not an error)
    if (!center || center.length === 0) {
      return NextResponse.json({ center: null });
    }

    return NextResponse.json({ center: center[0] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch center profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Require center authentication even in fallback mode
  const authResult = requireCenter(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403 error
  }
  const { user } = authResult;

  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Read body once and reuse it
  let bodyData: any;
  try {
    bodyData = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/profile`, {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      // fall back to supabase
    }
  }

  // Supabase fallback: requires authentication (already verified above)
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  
  try {
    const centerId = user.center_id || searchParams.get('center_id');
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const updates = bodyData;
    
    // Check if center exists first
    const { data: existingCenter } = await supabase
      .from('centers')
      .select('id')
      .eq('id', centerId);

    if (!existingCenter || existingCenter.length === 0) {
      // Create center if it doesn't exist
      const { data: newCenter, error: createError } = await supabase
        .from('centers')
        .insert({ 
          id: centerId,
          ...updates 
        })
        .select()
        .single();

      if (createError) {
        return NextResponse.json({ error: 'Failed to create center profile' }, { status: 500 });
      }

      return NextResponse.json({ center: newCenter });
    } else {
      // Update existing center
      const { data: center, error } = await supabase
        .from('centers')
        .update(updates)
        .eq('id', centerId)
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: 'Failed to update center profile' }, { status: 500 });
      }

      return NextResponse.json({ center });
    }

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update center profile' }, { status: 500 });
  }
}
