import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const { adminId, name, email, phone, role } = body;

    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required' }, { status: 400 });
    }


    // Get the authorization token
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Try backend API first, then fallback to Supabase
    const backendUrls = [
      'https://kashfety.com/api/super-admin/admins',
      'https://kashfety.com/api/admin/admins',
      process.env.NEXT_PUBLIC_API_URL && `${process.env.NEXT_PUBLIC_API_URL}/super-admin/admins`,
      process.env.NEXT_PUBLIC_API_URL && `${process.env.NEXT_PUBLIC_API_URL}/admin/admins`
    ].filter(Boolean);

    // Try backend endpoints first
    for (const baseUrl of backendUrls) {
      try {
        const apiUrl = `${baseUrl}/${adminId}`;

        const backendResponse = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name, email, phone, role })
        });

        if (backendResponse.ok) {
          const responseData = await backendResponse.json().catch(() => ({}));
          return NextResponse.json(responseData || {
            success: true,
            message: 'Admin updated successfully'
          });
        }


      } catch (error: any) {
        continue;
      }
    }

    // Fallback to Supabase if backend fails

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if admin exists
    const { data: existingAdmin, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', adminId)
      .in('role', ['admin', 'super_admin'])
      .single();

    if (fetchError || !existingAdmin) {
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Always update name if provided (even if empty string, to allow clearing)
    if (name !== undefined && name !== null) {
      updateData.name = name.trim() || null;
    }
    if (email) {
      // Check if email is already taken by another user
      const { data: emailUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', adminId)
        .single();

      if (emailUser) {
        return NextResponse.json({ success: false, error: 'Email already in use' }, { status: 409 });
      }
      updateData.email = email;
    }
    if (phone !== undefined) updateData.phone = phone;
    if (role && (role === 'admin' || role === 'super_admin')) {
      updateData.role = role;
    }

    // Log what we're updating

    // Update admin
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', adminId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to update admin',
        details: updateError.message
      }, { status: 500 });
    }

    console.log('✅ [Super Admin Update Admin] Updated admin data:', {
      id: updatedAdmin.id,
      name: updatedAdmin.name,
      email: updatedAdmin.email,
      phone: updatedAdmin.phone,
      role: updatedAdmin.role
    });

    return NextResponse.json({
      success: true,
      data: {
        admin: {
          id: updatedAdmin.id,
          uid: updatedAdmin.uid || updatedAdmin.id,
          name: updatedAdmin.name,
          email: updatedAdmin.email,
          phone: updatedAdmin.phone,
          role: updatedAdmin.role,
          isActive: updatedAdmin.is_active !== false,
          updatedAt: updatedAdmin.updated_at
        }
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

