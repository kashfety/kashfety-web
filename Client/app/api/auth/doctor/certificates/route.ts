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
        const response = await fetch(`${BACKEND_URL}/api/auth/doctor/certificates`, {
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

    // Fetch doctor certificates
    const { data: certificates, error } = await supabase
      .from('doctor_certificates')
      .select(`
        id,
        certificate_type,
        certificate_number,
        certificate_file_url,
        certificate_file_name,
        issuing_authority,
        issue_date,
        expiry_date,
        status,
        submitted_at,
        reviewed_at,
        rejection_reason,
        admin_notes
      `)
      .eq('doctor_id', doctorId)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching certificates:', error);
      return NextResponse.json({ error: 'Failed to fetch certificates' }, { status: 500 });
    }

    // Generate fresh signed URLs for all certificates (valid for 1 hour)
    const certificatesWithFreshUrls = await Promise.all(
      (certificates || []).map(async (cert) => {
        try {
          // Extract the storage path from the URL
          // URL format: https://<supabase-url>/storage/v1/object/sign/certificates/<file>?token=...
          // Or: https://<supabase-url>/storage/v1/object/public/certificates/<file>
          let filePath = cert.certificate_file_name;
          
          if (cert.certificate_file_url) {
            const urlParts = cert.certificate_file_url.split('/certificates/');
            if (urlParts.length > 1) {
              filePath = urlParts[1].split('?')[0]; // Get filename before query params
            }
          }
          
          // Generate a fresh signed URL valid for 1 hour
          const { data: signedUrlData, error: signError } = await supabase.storage
            .from('certificates')
            .createSignedUrl(filePath, 3600); // 3600 seconds = 1 hour

          if (signError) {
            console.error('Error signing URL for certificate:', cert.id, signError);
            return cert;
          }

          return {
            ...cert,
            certificate_file_url: signedUrlData?.signedUrl || cert.certificate_file_url
          };
        } catch (err) {
          console.error('Error generating signed URL for certificate:', cert.id, err);
          return cert; // Return original if signing fails
        }
      })
    );

    return NextResponse.json({ 
      success: true, 
      certificates: certificatesWithFreshUrls || [] 
    });

  } catch (error: any) {
    console.error('Proxy error (/api/auth/doctor/certificates GET):', error);
    return NextResponse.json({ error: 'Failed to connect to backend server' }, { status: 500 });
  }
}