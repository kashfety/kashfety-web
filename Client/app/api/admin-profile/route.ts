import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token and extract user info
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

export const dynamic = 'force-dynamic';

// GET - Get current admin's profile
export async function GET(request: NextRequest) {
  
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Extract user ID - it might be userId or id depending on token structure
    const userId = decoded.userId || decoded.id || decoded.sub;
    
    if (!userId) {
      );
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token structure' },
        { status: 401 }
      );
    }
    

    // Check if user is admin or super_admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Fetch admin profile from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) {
      throw userError;
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }


    return NextResponse.json({
      success: true,
      admin: {
        id: user.id,
        name: user.name,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        created_at: user.created_at,
        updated_at: user.updated_at,
        profile_picture: user.profile_picture,
        approval_status: user.approval_status
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch profile',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// PUT - Update current admin's profile
export async function PUT(request: NextRequest) {
  
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Extract user ID
    const userId = decoded.userId || decoded.id || decoded.sub;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token structure' },
        { status: 401 }
      );
    }

    // Check if user is admin or super_admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, first_name, last_name, email, phone, password, currentPassword } = body;


    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    
    // If password is being changed, hash it
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password_hash = hashedPassword;
    }

    updateData.updated_at = new Date().toISOString();

    // Update admin profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }


    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      admin: {
        id: updatedUser.id,
        name: updatedUser.name,
        first_name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        updated_at: updatedUser.updated_at
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to update profile',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
