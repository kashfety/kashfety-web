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

