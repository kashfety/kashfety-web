import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('📜 [Admin Doctor Certificates] Request received');
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    console.log('📜 [Admin Doctor Certificates] Params:', { page, limit, status, search });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Build count query first
    let countQuery = supabase
      .from('doctor_certificates')
      .select('*', { count: 'exact', head: true });

    // Build data query
    let dataQuery = supabase
      .from('doctor_certificates')
      .select('*');

    // Filter by status if provided
    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status);
      dataQuery = dataQuery.eq('status', status);
    }

    // Apply search if provided (search in certificate_number, issuing_authority)
    if (search) {
      countQuery = countQuery.or(`certificate_number.ilike.%${search}%,issuing_authority.ilike.%${search}%`);
      dataQuery = dataQuery.or(`certificate_number.ilike.%${search}%,issuing_authority.ilike.%${search}%`);
    }

    // Get total count
    const { count } = await countQuery;

    // Apply pagination and ordering to data query
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    dataQuery = dataQuery.range(from, to).order('submitted_at', { ascending: false });

    const { data: certificates, error } = await dataQuery;

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
        const { data: doctor, error: doctorError } = await supabase
          .from('users')
          .select('id, name, email, specialty, experience_years, phone')
          .eq('id', cert.doctor_id)
          .single();
        
        if (doctorError) {
          console.warn('⚠️ [Admin Doctor Certificates] Could not fetch doctor info for:', cert.doctor_id, doctorError.message);
        }
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

    const totalPages = Math.ceil((count || 0) / limit);

    console.log('✅ [Admin Doctor Certificates] Fetched', enrichedCertificates.length, 'certificates (page', page, 'of', totalPages, ')');

    return NextResponse.json({
      success: true,
      data: {
        certificates: enrichedCertificates,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
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

