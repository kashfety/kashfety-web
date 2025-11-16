import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
const JWT_SECRET = process.env.JWT_SECRET as string;

export async function PUT(request: NextRequest) {
  try {
    // Get and verify JWT token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let decoded: any;

    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId || decoded.id || decoded.sub;

    if (!userId) {
      return NextResponse.json({ error: 'Invalid token structure' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { home_visits_available } = body;

    if (typeof home_visits_available !== 'boolean') {
      return NextResponse.json({ error: 'home_visits_available must be a boolean' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify user is a doctor
    const { data: user, error: userCheckError } = await supabase
      .from('users')
      .select('id, role, name')
      .eq('id', userId)
      .single();

    if (userCheckError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'doctor') {
      return NextResponse.json({ error: 'Only doctors can access this endpoint' }, { status: 403 });
    }

    if (home_visits_available) {
      // Enable home visits - create home visit center if it doesn't exist
      
      // First update the user
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          home_visits_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update home visits setting' }, { status: 500 });
      }

      // Check if home visit center already exists
      const centerName = `${user.name} - Home Visit Schedule`;
      const { data: existingCenter, error: centerCheckError } = await supabase
        .from('centers')
        .select('id')
        .eq('name', centerName)
        .eq('owner_doctor_id', userId)
        .eq('center_type', 'personal')
        .maybeSingle();

      if (centerCheckError) {
        console.error('Error checking for existing center:', centerCheckError);
        return NextResponse.json({ error: 'Failed to check existing center' }, { status: 500 });
      }

      if (!existingCenter) {
        // Create new home visit center
        const { data: newCenter, error: centerError } = await supabase
          .from('centers')
          .insert({
            name: centerName,
            address: 'Home Visit Service',
            phone: null,
            email: null,
            center_type: 'personal',
            owner_doctor_id: userId,
            approval_status: 'approved',
            offers_labs: false,
            offers_imaging: false,
            operating_hours: {
              monday: { start: '09:00', end: '17:00', available: true },
              tuesday: { start: '09:00', end: '17:00', available: true },
              wednesday: { start: '09:00', end: '17:00', available: true },
              thursday: { start: '09:00', end: '17:00', available: true },
              friday: { start: '09:00', end: '17:00', available: true },
              saturday: { start: '09:00', end: '17:00', available: true },
              sunday: { start: '09:00', end: '17:00', available: false }
            },
            services: ['Home Visit Consultations']
          })
          .select()
          .single();

        if (centerError) {
          console.error('Error creating center:', centerError);
          return NextResponse.json({ error: 'Failed to create home visit center' }, { status: 500 });
        }

        // Create doctor-center relationship
        const { error: dcError } = await supabase
          .from('doctor_centers')
          .insert({
            doctor_id: userId,
            center_id: newCenter.id,
            is_primary: false
          });

        if (dcError) {
          console.error('Error creating doctor-center relationship:', dcError);
          return NextResponse.json({ error: 'Failed to link doctor to center' }, { status: 500 });
        }

        console.log(`✅ Created home visit center for doctor ${userId}: ${newCenter.id}`);
      }

    } else {
      // Disable home visits - remove home visit center
      
      // First update the user
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          home_visits_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ error: 'Failed to update home visits setting' }, { status: 500 });
      }

      // Find and delete home visit center
      const centerName = `${user.name} - Home Visit Schedule`;
      const { data: homeCenter, error: findError } = await supabase
        .from('centers')
        .select('id')
        .eq('name', centerName)
        .eq('owner_doctor_id', userId)
        .eq('center_type', 'personal')
        .maybeSingle();

      if (findError) {
        console.error('Error finding home center:', findError);
        // Continue anyway - main update succeeded
      }

      if (homeCenter) {
        // Delete doctor-center relationships first
        const { error: dcDeleteError } = await supabase
          .from('doctor_centers')
          .delete()
          .eq('doctor_id', userId)
          .eq('center_id', homeCenter.id);

        if (dcDeleteError) {
          console.error('Error deleting doctor-center relationship:', dcDeleteError);
        }

        // Delete schedules for this center
        const { error: schedDeleteError } = await supabase
          .from('doctor_schedules')
          .delete()
          .eq('doctor_id', userId)
          .eq('center_id', homeCenter.id);

        if (schedDeleteError) {
          console.error('Error deleting schedules:', schedDeleteError);
        }

        // Delete the center itself
        const { error: centerDeleteError } = await supabase
          .from('centers')
          .delete()
          .eq('id', homeCenter.id);

        if (centerDeleteError) {
          console.error('Error deleting center:', centerDeleteError);
        }

        console.log(`✅ Deleted home visit center for doctor ${userId}: ${homeCenter.id}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: home_visits_available 
        ? 'Home visits enabled successfully' 
        : 'Home visits disabled successfully',
      home_visits_available
    });

  } catch (error: any) {
    console.error('Toggle home visits error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' }, 
      { status: 500 }
    );
  }
}
