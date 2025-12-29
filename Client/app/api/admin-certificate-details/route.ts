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

    // Fetch certificate details
    const { data: certificate, error: certError } = await supabase
      .from('doctor_certificates')
      .select('*')
      .eq('id', certificateId)
      .single();

    if (certError || !certificate) {
      return NextResponse.json({ success: false, error: 'Certificate not found', details: certError?.message }, { status: 404 });
    }

    // Fetch doctor information
    let doctorInfo = null;
    if (certificate.doctor_id) {
      const { data: doctor, error: doctorError } = await supabase
        .from('users')
        .select('id, name, email, phone, specialty, experience_years, bio, qualifications')
        .eq('id', certificate.doctor_id)
        .single();
      
      if (doctorError) {
      } else {
        doctorInfo = doctor;
      }
    }

    // Transform certificate data
    const transformedCertificate = {
      id: certificate.id,
      doctor_id: certificate.doctor_id,
      certificate_type: certificate.certificate_type,
      certificate_number: certificate.certificate_number,
      issuing_authority: certificate.issuing_authority,
      issue_date: certificate.issue_date,
      expiry_date: certificate.expiry_date,
      certificate_file_url: certificate.certificate_file_url,
      certificate_file_path: certificate.certificate_file_path,
      certificate_file_name: certificate.certificate_file_name || certificate.certificate_file_path?.split('/').pop() || 'certificate.pdf',
      status: certificate.status || 'pending',
      submitted_at: certificate.submitted_at || certificate.created_at,
      reviewed_at: certificate.reviewed_at,
      reviewed_by: certificate.reviewed_by,
      rejection_reason: certificate.rejection_reason,
      certificate_comments: certificate.certificate_comments,
      certificate_resubmission_requirements: certificate.certificate_resubmission_requirements,
      certificate_resubmission_deadline: certificate.certificate_resubmission_deadline,
      certificate_resubmission_requested_at: certificate.certificate_resubmission_requested_at,
      admin_notes: certificate.admin_notes,
      created_at: certificate.created_at,
      updated_at: certificate.updated_at,
      doctor: doctorInfo ? {
        id: doctorInfo.id,
        name: doctorInfo.name,
        email: doctorInfo.email,
        phone: doctorInfo.phone,
        specialty: doctorInfo.specialty,
        experience_years: doctorInfo.experience_years,
        bio: doctorInfo.bio,
        qualifications: doctorInfo.qualifications,
        // Add flattened fields for component compatibility
        doctor_name: doctorInfo.name,
        doctor_email: doctorInfo.email,
        doctor_phone: doctorInfo.phone
      } : null,
      // Add flattened fields for component compatibility
      doctor_name: doctorInfo?.name || 'Unknown',
      doctor_email: doctorInfo?.email || 'Unknown',
      doctor_phone: doctorInfo?.phone || 'Unknown',
      specialty: doctorInfo?.specialty || 'General',
      certificate_status: certificate.status || 'pending'
    };


    return NextResponse.json({
      success: true,
      data: transformedCertificate
    });

  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

