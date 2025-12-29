import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const certificateId = searchParams.get('certificateId');

    if (!certificateId) {
      return NextResponse.json({ success: false, error: 'Certificate ID is required' }, { status: 400 });
    }


    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch certificate to get file path
    const { data: certificate, error: certError } = await supabase
      .from('doctor_certificates')
      .select('certificate_file_path, certificate_file_url, certificate_file_name')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found', details: certError?.message }, { status: 404 });
    }

    // Get file path (prefer file_path over file_url)
    let filePath = certificate.certificate_file_path;
    
    // If no file_path, try to extract from file_url
    if (!filePath && certificate.certificate_file_url) {
      // Extract path from signed URL or public URL
      // Format: https://...supabase.co/storage/v1/object/sign/medical-documents/certificates/.../file.pdf?token=...
      // Or: https://...supabase.co/storage/v1/object/public/medical-documents/certificates/.../file.pdf
      const urlMatch = certificate.certificate_file_url.match(/medical-documents\/([^?]+)/);
      if (urlMatch && urlMatch[1]) {
        // Extract the path after 'medical-documents/'
        filePath = urlMatch[1];
        // Decode URL encoding
        filePath = decodeURIComponent(filePath);
      } else {
        // Try to extract from path-like URL (certificates/...)
        const pathMatch = certificate.certificate_file_url.match(/certificates\/([^?]+)/);
        if (pathMatch && pathMatch[1]) {
          filePath = pathMatch[1];
          filePath = decodeURIComponent(filePath);
        }
      }
    }

    if (!filePath) {
      return NextResponse.json({ success: false, error: 'Certificate file path not found' }, { status: 404 });
    }

    // Remove 'medical-documents/' prefix if present (since we specify bucket in .from())
    if (filePath.startsWith('medical-documents/')) {
      filePath = filePath.replace('medical-documents/', '');
    }


    // Generate a fresh signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('medical-documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (urlError) {
      
      // Try to get public URL as fallback
      const { data: publicUrlData } = supabase.storage
        .from('medical-documents')
        .getPublicUrl(filePath);
      
      if (publicUrlData?.publicUrl) {
        return NextResponse.json({
          success: true,
          download_url: publicUrlData.publicUrl,
          file_name: certificate.certificate_file_name || 'certificate.pdf'
        });
      }
      
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to generate download URL',
        details: urlError.message 
      }, { status: 500 });
    }


    return NextResponse.json({
      success: true,
      download_url: urlData.signedUrl,
      file_name: certificate.certificate_file_name || 'certificate.pdf',
      expires_in: 3600
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

