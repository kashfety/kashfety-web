import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('🎨 [Admin Banners] Request received');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all banners ordered by display_order and created_at
    const { data: banners, error } = await supabase
      .from('banners')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch banners:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch banners',
        details: error.message 
      }, { status: 500 });
    }

    // Transform banners to match expected format
    const transformedBanners = (banners || []).map((banner: any) => ({
      id: banner.id,
      title: banner.title,
      description: banner.description,
      file_name: banner.file_name,
      file_url: banner.file_url,
      file_path: banner.file_path,
      file_size: banner.file_size,
      mime_type: banner.mime_type,
      display_order: banner.display_order || 0,
      is_active: banner.is_active !== false,
      target_audience: banner.target_audience || 'all',
      click_url: banner.click_url,
      click_count: banner.click_count || 0,
      view_count: banner.view_count || 0,
      start_date: banner.start_date,
      end_date: banner.end_date,
      created_at: banner.created_at,
      updated_at: banner.updated_at
    }));

    console.log('✅ [Admin Banners] Fetched', transformedBanners.length, 'banners');

    return NextResponse.json({
      success: true,
      data: transformedBanners
    });

  } catch (error: any) {
    console.error('❌ Admin banners API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📤 [Admin Banners] Upload request received');

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('banner') as File || formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const displayOrder = formData.get('display_order') as string;
    const isActive = formData.get('is_active') as string;
    const targetAudience = formData.get('target_audience') as string;
    const clickUrl = formData.get('click_url') as string;
    const startDate = formData.get('start_date') as string;
    const endDate = formData.get('end_date') as string;

    console.log('📋 FormData entries:', Array.from(formData.keys()));

    if (!file) {
      return NextResponse.json({ 
        success: false, 
        error: 'No file provided' 
      }, { status: 400 });
    }

    console.log('📁 File details:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upload file to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('public-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to upload file',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase
      .storage
      .from('public-files')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;

    // Save banner metadata to database
    const { data: banner, error: dbError } = await supabase
      .from('banners')
      .insert({
        title: title || 'Untitled Banner',
        description: description || '',
        file_name: file.name,
        file_url: fileUrl,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        display_order: displayOrder ? parseInt(displayOrder) : 0,
        is_active: isActive === 'true',
        target_audience: targetAudience || 'all',
        click_url: clickUrl || null,
        start_date: startDate || null,
        end_date: endDate || null,
        click_count: 0,
        view_count: 0
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save banner',
        details: dbError.message 
      }, { status: 500 });
    }

    console.log('✅ Banner uploaded successfully:', banner.id);

    return NextResponse.json({
      success: true,
      data: banner
    });

  } catch (error: any) {
    console.error('❌ Banner upload error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { bannerId, ...updates } = body;

    if (!bannerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Banner ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: banner, error } = await supabase
      .from('banners')
      .update(updates)
      .eq('id', bannerId)
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to update banner:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update banner',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: banner
    });

  } catch (error: any) {
    console.error('❌ Banner update error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bannerId = searchParams.get('bannerId');

    if (!bannerId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Banner ID is required' 
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get banner details to delete file from storage
    const { data: banner } = await supabase
      .from('banners')
      .select('file_path')
      .eq('id', bannerId)
      .single();

    // Delete from database
    const { error: deleteError } = await supabase
      .from('banners')
      .delete()
      .eq('id', bannerId);

    if (deleteError) {
      console.error('❌ Failed to delete banner:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete banner',
        details: deleteError.message 
      }, { status: 500 });
    }

    // Delete file from storage if exists
    if (banner?.file_path) {
      await supabase
        .storage
        .from('public-files')
        .remove([banner.file_path]);
    }

    return NextResponse.json({
      success: true,
      message: 'Banner deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Banner delete error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

