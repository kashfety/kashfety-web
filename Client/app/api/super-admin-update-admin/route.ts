import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    console.log('👑 [Super Admin Update Admin] Request received');
    const { searchParams } = new URL(request.url);
    const adminId = searchParams.get('adminId');

    if (!adminId) {
      return NextResponse.json({ success: false, error: 'Admin ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, phone, role } = body;

    console.log('👑 [Super Admin Update Admin] Updating admin:', adminId, 'with data:', { name, email, phone, role });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
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
      console.error('❌ Admin not found:', fetchError);
      return NextResponse.json({ success: false, error: 'Admin not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
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

    // Update admin
    const { data: updatedAdmin, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', adminId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Failed to update admin:', updateError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update admin',
        details: updateError.message 
      }, { status: 500 });
    }

    console.log('✅ [Super Admin Update Admin] Updated admin:', adminId);

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
    console.error('❌ Super admin update admin API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

