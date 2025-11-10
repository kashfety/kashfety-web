import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('📜 [Admin Doctor Certificates] Request received');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build query for certificates
    let query = supabase
      .from('doctor_certificates')
      .select('*')
      .order('submitted_at', { ascending: false });

    // Filter by status if provided
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: certificates, error } = await query;

    if (error) {
      console.error('❌ Failed to fetch certificates:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch certificates',
        details: error.message 
      }, { status: 500 });
    }

    // Enrich certificates with doctor information
    const enrichedCertificates = [];
    for (const cert of certificates || []) {
      let doctorInfo = null;
      if (cert.doctor_id) {
        const { data: doctor } = await supabase
          .from('users')
          .select('id, name, email, specialty, experience_years, phone')
          .eq('id', cert.doctor_id)
          .single();
        doctorInfo = doctor;
      }

      enrichedCertificates.push({
        id: cert.id,
        doctor_id: cert.doctor_id,
        certificate_type: cert.certificate_type,
        certificate_number: cert.certificate_number,
        issuing_authority: cert.issuing_authority,
        issue_date: cert.issue_date,
        expiry_date: cert.expiry_date,
        certificate_file_url: cert.certificate_file_url,
        certificate_file_path: cert.certificate_file_path,
        status: cert.status || 'pending',
        submitted_at: cert.submitted_at || cert.created_at,
        created_at: cert.created_at,
        updated_at: cert.updated_at,
        doctor: doctorInfo ? {
          id: doctorInfo.id,
          name: doctorInfo.name,
          email: doctorInfo.email,
          specialty: doctorInfo.specialty,
          experience_years: doctorInfo.experience_years,
          phone: doctorInfo.phone
        } : null
      });
    }

    console.log('✅ [Admin Doctor Certificates] Fetched', enrichedCertificates.length, 'certificates with status:', status);

    return NextResponse.json({
      success: true,
      data: {
        certificates: enrichedCertificates
      }
    });

  } catch (error: any) {
    console.error('❌ Admin doctor certificates API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

