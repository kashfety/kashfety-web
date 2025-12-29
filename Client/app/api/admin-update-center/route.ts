import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function POST(request: NextRequest) {
  try {
    
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { centerId, ...updates } = body;
    
    if (!centerId) {
      return NextResponse.json({ 
        error: 'Center ID is required' 
      }, { status: 400 });
    }

    // Extract password fields if present
    const { password, confirmPassword, ...centerUpdates } = updates;

    // Filter out fields that don't exist in the centers table
    const allowedFields = [
      'name', 'name_ar', 'address', 'phone', 'email', 'operating_hours', 
      'services', 'center_type', 'approval_status', 'offers_labs', 
      'offers_imaging', 'updated_at'
    ];
    
    const filteredUpdates: any = {};
    Object.keys(centerUpdates).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredUpdates[key] = centerUpdates[key];
      } else {
      }
    });
    
    // Always update the updated_at timestamp
    filteredUpdates.updated_at = new Date().toISOString();
    

    // Update center record
    const { data: center, error: centerError } = await supabase
      .from('centers')
      .update(filteredUpdates)
      .eq('id', centerId)
      .select()
      .single();

    if (centerError) {
      return NextResponse.json({ 
        error: 'Failed to update center',
        details: centerError.message 
      }, { status: 500 });
    }

    let passwordUpdated = false;

    // Handle password update if provided
    if (password && password.trim() !== '') {
      
      if (password !== confirmPassword) {
        return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
      }

      // Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Find the user associated with this center
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('center_id', centerId)
        .eq('role', 'center')
        .single();

      let userId;

      if (userError || !user) {
        // If no user found, try to find by email
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('id')
          .eq('email', center.email)
          .eq('role', 'center')
          .single();

        if (emailError || !userByEmail) {
          return NextResponse.json({ 
            center, 
            warning: 'Center updated but no user account found to update password' 
          });
        }

        userId = userByEmail.id;
      } else {
        userId = user.id;
      }

      // Update user password
      const { error: passwordError } = await supabase
        .from('users')
        .update({ password_hash: hashedPassword })
        .eq('id', userId);

      if (passwordError) {
        return NextResponse.json({ 
          center, 
          warning: 'Center updated but failed to update password' 
        });
      }

      passwordUpdated = true;
    }

    
    return NextResponse.json({
      success: true,
      center,
      passwordUpdated
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
