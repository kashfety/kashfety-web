import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Generate UUID v4
function generateUserId(role: string): string {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

// Generate JWT token (simplified version)
function generateToken(user: any): string {
  const jwt = require('jsonwebtoken');
  const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  
  return jwt.sign(
    { 
      id: user.id,
      email: user.email,
      role: user.role 
    }, 
    secret, 
    { 
      expiresIn: '24h',
      issuer: 'doctor-appointment-system'
    }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      first_name,
      last_name,
      name,
      first_name_ar,
      last_name_ar,
      name_ar,
      email,
      password,
      role,
      phone,
      gender,
      date_of_birth,
      specialty,
      bio,
      experience_years,
      consultation_fee,
      center_address,
      center_type,
      offers_labs,
      offers_imaging,
      email_verified,
      supabase_user_id
    } = body;


    // Validate required fields
    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name, and role are required' },
        { status: 400 }
      );
    }

    // Check if user already exists by email
    const { data: existingUserByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUserByEmail) {
      // Generate JWT token for existing user
      const token = generateToken(existingUserByEmail);
      const { password_hash: _, ...userResponse } = existingUserByEmail;
      
      return NextResponse.json({
        message: 'User already exists',
        success: true,
        user: userResponse,
        token,
        expiresIn: '24h'
      });
    }

    // Also check by Supabase user ID if provided
    if (supabase_user_id) {
      const { data: existingUserById } = await supabase
        .from('users')
        .select('*')
        .eq('uid', supabase_user_id)
        .single();

      if (existingUserById) {
        
        // Update existing user with new signup information
        const updateData: any = {
          first_name,
          last_name,
          name,
          first_name_ar: first_name_ar || existingUserById.first_name_ar,
          last_name_ar: last_name_ar || existingUserById.last_name_ar,
          name_ar: name_ar || existingUserById.name_ar,
          role: role.toLowerCase(),
          phone,
          gender: gender || existingUserById.gender,
          date_of_birth: date_of_birth || existingUserById.date_of_birth,
          specialty: specialty || existingUserById.specialty,
          bio: bio || existingUserById.bio,
          experience_years: experience_years || existingUserById.experience_years,
          consultation_fee: consultation_fee || existingUserById.consultation_fee,
          center_address: center_address || existingUserById.center_address,
          center_type: center_type || existingUserById.center_type,
          offers_labs: offers_labs !== undefined ? offers_labs : existingUserById.offers_labs,
          offers_imaging: offers_imaging !== undefined ? offers_imaging : existingUserById.offers_imaging,
          email_verified: email_verified || existingUserById.email_verified,
          updated_at: new Date().toISOString()
        };

        // Update password if provided
        if (password) {
          const saltRounds = 12;
          updateData.password_hash = await bcrypt.hash(password, saltRounds);
        }

        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('uid', supabase_user_id)
          .select()
          .single();

        if (updateError) {
          throw new Error('Failed to update user information');
        }

        // Generate JWT token for updated user
        const token = generateToken(updatedUser);
        const { password_hash: _, ...userResponse } = updatedUser;
        
        return NextResponse.json({
          message: 'User updated successfully',
          success: true,
          user: userResponse,
          token,
          expiresIn: '24h'
        });
      }
    }

    // Hash password
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // Use Supabase user ID if available, otherwise generate a new UUID
    let userId;
    if (supabase_user_id && typeof supabase_user_id === 'string' && supabase_user_id.length > 0) {
      userId = supabase_user_id;
    } else {
      // Generate a proper UUID v4 if Supabase ID is not available
      userId = generateUserId(role);
    }

    // Prepare user data for insertion
    const userData: any = {
      id: userId,  // Primary key UUID
      uid: userId, // Use same UUID for uid field
      first_name,
      last_name,
      name,
      first_name_ar,
      last_name_ar,
      name_ar,
      email,
      password_hash,
      role: role.toLowerCase(),
      phone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_first_login: true,
      approval_status: role === 'doctor' ? 'pending' : 'approved'
    };

    // Add optional fields based on role
    if (role === 'patient') {
      if (gender) userData.gender = gender;
      if (date_of_birth) userData.date_of_birth = date_of_birth;
    } else if (role === 'doctor') {
      if (specialty) userData.specialty = specialty;
      if (bio) userData.bio = bio;
      if (experience_years) userData.experience_years = experience_years;
      if (consultation_fee) userData.consultation_fee = consultation_fee;
    }


    // Insert user into database
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (insertError) {
      
      // Handle duplicate key error (user already exists)
      if (insertError.code === '23505' && insertError.message.includes('users_pkey')) {
        
        // Try to fetch the existing user by email
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('email', email)
          .single();
        
        if (existingUser) {
          const token = generateToken(existingUser);
          const { password_hash: _, ...userResponse } = existingUser;
          
          return NextResponse.json({
            message: 'User already exists',
            success: true,
            user: userResponse,
            token,
            expiresIn: '24h'
          });
        }
      }
      
      throw new Error(insertError.message || 'Failed to create user');
    }


    // Handle center creation if role is center
    if (role === 'center') {
      try {
        const centerData = {
          id: generateUserId('center'),
          name: name,
          name_ar: name_ar,
          address: center_address || '',
          phone: phone,
          email: email,
          center_type: center_type || 'generic',
          offers_labs: offers_labs || false,
          offers_imaging: offers_imaging || false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newCenter, error: centerError } = await supabase
          .from('centers')
          .insert([centerData])
          .select()
          .single();

        if (centerError) {
          // Don't fail the user creation if center creation fails
        } else {
          // Update user with center_id
          await supabase
            .from('users')
            .update({ center_id: newCenter.id })
            .eq('id', newUser.id);
        }
      } catch (centerErr) {
        // Continue with user creation even if center creation fails
      }
    }

    // Generate JWT token
    const token = generateToken(newUser);

    // Remove sensitive information
    const { password_hash: _, ...userResponse } = newUser;


    return NextResponse.json({
      message: 'User registered successfully',
      success: true,
      user: userResponse,
      token,
      expiresIn: '24h'
    });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}

