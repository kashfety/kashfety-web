import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Generate UUID v4
function generateUserId(role: string): string {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Require admin or super_admin role
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403
    }

    const body = await request.json();

    // Validate required fields for center creation
    const { name, name_ar, address, phone, email, password, center_type, offers_labs, offers_imaging } = body;
    
    if (!name || !address || !phone || !email || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, address, phone, email, and password are required' 
      }, { status: 400 });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate UID for the center user
    const uid = generateUserId('center');

    // Create user account first
    const userData = {
      uid: uid,
      phone,
      role: 'center',
      first_name: name.split(' ')[0] || name,
      last_name: name.split(' ').slice(1).join(' ') || '',
      name: name,
      name_ar: name_ar || null,
      email: email,
      password_hash: hashedPassword,
      is_first_login: true,
      default_dashboard: 'center-dashboard',
      approval_status: 'approved'
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Failed to create user account for center' }, { status: 500 });
    }

    // Create center record
    const centerData = {
      name,
      name_ar: name_ar || null,
      address,
      phone,
      email,
      operating_hours: body.operating_hours || null,
      services: body.services || [],
      center_type: center_type || 'generic',
      approval_status: body.approval_status || 'approved',
      offers_labs: offers_labs || false,
      offers_imaging: offers_imaging || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: center, error: centerError } = await supabase
      .from('centers')
      .insert(centerData)
      .select()
      .single();

    if (centerError) {
      // Clean up user if center creation fails
      await supabase.from('users').delete().eq('id', newUser.id);
      return NextResponse.json({ error: 'Failed to create center record' }, { status: 500 });
    }

    // Link user to center
    const { error: updateError } = await supabase
      .from('users')
      .update({ center_id: center.id })
      .eq('id', newUser.id);

    if (updateError) {
      // Clean up both records if linking fails
      await supabase.from('centers').delete().eq('id', center.id);
      await supabase.from('users').delete().eq('id', newUser.id);
      return NextResponse.json({ error: 'Failed to link user to center' }, { status: 500 });
    }

    
    return NextResponse.json({
      success: true,
      data: {
        center: center,
        user: {
          id: newUser.id,
          uid: newUser.uid,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role
        }
      }
    });

  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
