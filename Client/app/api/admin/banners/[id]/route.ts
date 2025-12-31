import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Require admin authentication
    const authResult = requireAdmin(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 or 403 error
    }

    // Handle params as Promise (Next.js 15) or object (Next.js 14)
    const resolvedParams = await Promise.resolve(params);
    const { id: bannerId } = resolvedParams;

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
      .select('file_path, file_name')
      .eq('id', bannerId)
      .single();

    // Delete from database
    const { error: deleteError } = await supabase
      .from('banners')
      .delete()
      .eq('id', bannerId);

    if (deleteError) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete banner',
        details: deleteError.message 
      }, { status: 500 });
    }

    // Delete file from storage if exists
    if (banner) {
      const fileToDelete = banner.file_path || banner.file_name;
      if (fileToDelete) {
        try {
          await supabase
            .storage
            .from('banners')
            .remove([fileToDelete]);
        } catch (storageError) {
          // Continue even if storage deletion fails
          console.error('Failed to delete file from storage:', storageError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Banner deleted successfully'
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

