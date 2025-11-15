import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper to upload file to Supabase Storage
async function uploadToStorage(file: File, doctorId: string) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${doctorId}_${Date.now()}.${fileExt}`;
  const filePath = `certificates/${fileName}`;

  // Convert File to ArrayBuffer then to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { data, error } = await supabase.storage
    .from('medical-documents')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false
    });

  if (error) {
    throw error;
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('medical-documents')
    .getPublicUrl(filePath);

  return {
    url: publicUrl,
    path: filePath
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get the authorization token from headers
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    // Verify the token and get user info
    let userId: string;
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      userId = payload.id || payload.sub;
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    // Verify user is a doctor
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'doctor') {
      return NextResponse.json(
        { error: 'Only doctors can upload certificates' },
        { status: 403 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const certificate = formData.get('certificate') as File;
    const certificate_type = formData.get('certificate_type') as string;
    const certificate_number = formData.get('certificate_number') as string;
    const issuing_authority = formData.get('issuing_authority') as string;
    const issue_date = formData.get('issue_date') as string;
    const expiry_date = formData.get('expiry_date') as string;

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificate file is required' },
        { status: 400 }
      );
    }

    if (!certificate_type || !issuing_authority) {
      return NextResponse.json(
        { error: 'Certificate type and issuing authority are required' },
        { status: 400 }
      );
    }

    // Check if doctor already has a pending or approved certificate
    const { data: existingCert } = await supabase
      .from('doctor_certificates')
      .select('id, status')
      .eq('doctor_id', userId)
      .in('status', ['pending', 'approved'])
      .single();

    if (existingCert) {
      return NextResponse.json(
        { error: `You already have a ${existingCert.status} certificate. Please wait for review or contact admin.` },
        { status: 400 }
      );
    }

    // Upload file to Supabase Storage
    console.log('📤 Uploading certificate to Supabase Storage...');
    const uploadResult = await uploadToStorage(certificate, userId);

    // Save certificate to database
    const certificateData = {
      doctor_id: userId,
      certificate_type: certificate_type || 'medical_license',
      certificate_number: certificate_number || null,
      certificate_file_url: uploadResult.url,
      certificate_file_path: uploadResult.path,
      certificate_file_name: certificate.name,
      issuing_authority,
      issue_date: issue_date || null,
      expiry_date: expiry_date || null,
      status: 'pending',
      file_size: certificate.size,
      mime_type: certificate.type
    };

    const { data: certRecord, error: insertError } = await supabase
      .from('doctor_certificates')
      .insert(certificateData)
      .select()
      .single();

    if (insertError) {
      // Clean up uploaded file on database error
      try {
        await supabase.storage
          .from('medical-documents')
          .remove([uploadResult.path]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      throw insertError;
    }

    // Update user's approval status to pending (waiting for certificate approval)
    await supabase
      .from('users')
      .update({ approval_status: 'pending' })
      .eq('id', userId);

    console.log('✅ Doctor certificate uploaded successfully:', certRecord.id);

    return NextResponse.json({
      success: true,
      message: 'Certificate uploaded successfully. Please wait for admin approval.',
      data: {
        certificate_id: certRecord.id,
        status: certRecord.status,
        submitted_at: certRecord.submitted_at,
        file_url: uploadResult.url
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Certificate upload error:', error);

    return NextResponse.json(
      { error: error.message || 'Failed to upload certificate' },
      { status: 500 }
    );
  }
}
