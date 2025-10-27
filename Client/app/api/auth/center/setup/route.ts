import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ensureCenterExists } from '../utils/center-validation';
import { getUserFromAuth } from '../utils/jwt-auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userInfo } = await request.json();
    
    if (!userInfo || !userInfo.name || !userInfo.phone) {
      return NextResponse.json({ 
        error: 'User information (name and phone) is required' 
      }, { status: 400 });
    }

    // Ensure center record exists for this user
    const result = await ensureCenterExists(user.id, userInfo);
    
    if (!result.exists) {
      return NextResponse.json({ 
        error: result.error || 'Failed to ensure center exists' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      center: result.center,
      message: 'Center record verified/created successfully'
    });

  } catch (error) {
    console.error('Center setup error:', error);
    return NextResponse.json({
      error: 'Internal server error during center setup'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuth(request);
    if (!user || user.role !== 'center') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get user info from database (already fetched in getUserFromAuth)
    const userData = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      center_id: user.center_id
    };

    // Check center record status
    let centerRecord = null;
    let needsSetup = false;

    if (userData.center_id) {
      try {
        const { data: center, error: centerError } = await supabase
          .from('centers')
          .select('*')
          .eq('id', userData.center_id)
          .single();

        if (centerError) {
          console.warn('Center record not found for center_id:', userData.center_id, centerError);
          needsSetup = true;
        } else {
          centerRecord = center;
        }
      } catch (error) {
        console.error('Error checking center record:', error);
        needsSetup = true;
      }
    } else {
      needsSetup = true;
    }

    return NextResponse.json({
      success: true,
      user: userData,
      center: centerRecord,
      needsSetup,
      message: needsSetup ? 'Center record needs to be created' : 'Center record exists'
    });

  } catch (error) {
    console.error('Center status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error during center status check'
    }, { status: 500 });
  }
}
