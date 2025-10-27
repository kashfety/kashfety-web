import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }
    
    console.log('🔧 Fix user-center: Looking for user:', userId);
    
    // Find the user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, center_id, role, name')
      .eq('id', userId)
      .single();
      
    if (userError || !user) {
      console.log('❌ User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('👤 Found user:', { id: user.id, name: user.name, role: user.role, center_id: user.center_id });
    
    if (user.role !== 'center') {
      return NextResponse.json({ error: 'User is not a center user' }, { status: 400 });
    }
    
    // Find centers that might belong to this user
    const { data: centers, error: centersError } = await supabase
      .from('centers')
      .select('id, name, owner_doctor_id, created_at')
      .order('created_at', { ascending: false });
      
    if (centersError) {
      console.log('❌ Error fetching centers:', centersError);
      return NextResponse.json({ error: 'Failed to fetch centers' }, { status: 500 });
    }
    
    console.log('🏥 Found centers:', centers);
    
    // If user already has a center_id, check if it exists
    if (user.center_id) {
      const userCenter = centers.find(c => c.id === user.center_id);
      if (userCenter) {
        console.log('✅ User already linked to existing center:', userCenter);
        return NextResponse.json({ 
          message: 'User already properly linked', 
          user: user,
          center: userCenter
        });
      } else {
        console.log('⚠️ User linked to non-existent center, will relink');
      }
    }
    
    // Find the most recent center (likely created by this user)
    const latestCenter = centers[0];
    
    if (!latestCenter) {
      return NextResponse.json({ error: 'No centers found' }, { status: 404 });
    }
    
    console.log('🔗 Linking user to latest center:', latestCenter);
    
    // Update user with center_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ center_id: latestCenter.id })
      .eq('id', userId);
      
    if (updateError) {
      console.log('❌ Failed to update user:', updateError);
      return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
    
    console.log('✅ Successfully linked user to center');
    
    return NextResponse.json({ 
      message: 'User successfully linked to center',
      user: { ...user, center_id: latestCenter.id },
      center: latestCenter
    });
    
  } catch (error: any) {
    console.error('Fix user-center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
