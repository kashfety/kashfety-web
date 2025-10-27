import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
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
      console.error('Backend request failed:', e);
      // fall back to supabase
    }
  }

  // Supabase fallback: requires center_id query param
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  
  try {
    console.log('🔄 Profile fallback: Starting Supabase fallback');
    // Get center_id from query param as fallback
    let centerId = searchParams.get('center_id');
    console.log('📍 Profile fallback: center_id from query param:', centerId);
    
    // Always try to get center_id from authenticated user first if auth header exists
    if (authHeader) {
      console.log('🔍 Profile fallback: Auth header found, trying to get center_id from JWT');
      const token = authHeader.replace('Bearer ', '');
      
      try {
        // Decode JWT to get user ID
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = parts[1];
          const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
          const userId = decodedPayload.id;
          console.log('👤 Profile fallback: Decoded user ID:', userId);
          
          if (userId) {
            // Look up user to get their center_id
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
            const { data: user, error: userError } = await supabase
              .from('users')
              .select('center_id')
              .eq('id', userId)
              .eq('role', 'center')
              .single();
              
            if (!userError && user?.center_id) {
              centerId = user.center_id;
              console.log(`✅ Found center_id ${centerId} for user ${userId}`);
            } else {
              console.log(`❌ No center_id found for user ${userId}, error:`, userError);
            }
          }
        }
      } catch (jwtError) {
        console.error('Failed to decode JWT:', jwtError);
      }
    }
    
    if (!centerId) {
      console.log('❌ Profile fallback: No center_id found, returning null');
      return NextResponse.json({ center: null, message: 'No center record found' });
    }

    console.log(`🎯 Profile fallback: Using center_id: ${centerId}`);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First check if center exists
    const { data: center, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId);

    if (error) {
      console.error('Get center profile error:', error);
      return NextResponse.json({ error: 'Failed to fetch center profile' }, { status: 500 });
    }

    // If no center found, return null profile (not an error)
    if (!center || center.length === 0) {
      console.log('No center found for ID:', centerId);
      return NextResponse.json({ center: null });
    }

    return NextResponse.json({ center: center[0] });

  } catch (error: any) {
    console.error('Center profile fallback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch center profile' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const body = await request.json();
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/profile`, {
        method: 'PUT',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      console.error('Backend request failed:', e);
      // fall back to supabase
    }
  }

  // Supabase fallback: requires center_id query param
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
  
  try {
    const centerId = searchParams.get('center_id');
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const updates = await request.json();
    
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
        console.error('Failed to create center:', createError);
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
        console.error('Failed to update center:', error);
        return NextResponse.json({ error: 'Failed to update center profile' }, { status: 500 });
      }

      return NextResponse.json({ center });
    }

  } catch (error: any) {
    console.error('Center profile update fallback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update center profile' }, { status: 500 });
  }
}
