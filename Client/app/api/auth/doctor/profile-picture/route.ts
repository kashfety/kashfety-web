import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const AUTH_FALLBACK_ENABLED = process.env.AUTH_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/doctor/profile-picture`, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        // If backend rejects, fall through to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // Continue to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) {
          return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
        }
      }
    } else if (!AUTH_FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Supabase fallback (DEV): requires doctor_id
    const doctorId = searchParams.get('doctor_id');
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch doctor's profile picture URL
    const { data: user, error } = await supabase
      .from('users')
      .select('profile_picture_url')
      .eq('id', doctorId)
      .eq('role', 'doctor')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch profile picture' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile_picture_url: user?.profile_picture_url || null
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);

    // Read formData only once at the beginning
    const formData = await request.formData();

    if (authHeader) {
      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/doctor/profile-picture`, {
          method: 'POST',
          headers: {
            Authorization: authHeader,
          },
          body: formData,
        });
        const data = await response.json();
        if (response.ok) return NextResponse.json(data);
        // If backend rejects, fall through to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) return NextResponse.json(data, { status: response.status });
      } catch (e) {
        // Continue to fallback when enabled
        if (!AUTH_FALLBACK_ENABLED) {
          return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
        }
      }
    } else if (!AUTH_FALLBACK_ENABLED) {
      return NextResponse.json({ error: 'Authorization header required' }, { status: 401 });
    }

    // Supabase fallback (DEV): requires doctor_id
    const doctorId = searchParams.get('doctor_id');
    if (!doctorId) return NextResponse.json({ error: 'doctor_id is required' }, { status: 400 });
    const file = formData.get('profile_picture') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, { status: 400 });
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size too large. Maximum 5MB allowed.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${doctorId}-${Date.now()}.${fileExtension}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    const profilePictureUrl = urlData.publicUrl;

    // Update user's profile_picture_url in database
    const { error: updateError } = await supabase
      .from('users')
      .update({ profile_picture_url: profilePictureUrl })
      .eq('id', doctorId)
      .eq('role', 'doctor');

    if (updateError) {
      // Try to delete the uploaded file if database update fails
      await supabase.storage.from('profile-pictures').remove([fileName]);
      return NextResponse.json({ error: 'Failed to update profile picture URL' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      profile_picture_url: profilePictureUrl,
      message: 'Profile picture uploaded successfully'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}