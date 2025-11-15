import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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
    // For now, we'll decode the JWT to get the user ID
    // In production, you should properly verify the JWT signature
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
        { error: 'Only doctors can skip certificate upload' },
        { status: 403 }
      );
    }

    // Check if doctor already has any certificate records
    const { data: existingCerts } = await supabase
      .from('doctor_certificates')
      .select('id, status')
      .eq('doctor_id', userId);

    // If no certificate records exist, create a placeholder record to indicate they skipped
    if (!existingCerts || existingCerts.length === 0) {
      const { error: insertError } = await supabase
        .from('doctor_certificates')
        .insert({
          doctor_id: userId,
          certificate_type: 'medical_license',
          certificate_file_name: 'pending_upload',
          certificate_file_url: null,
          status: 'pending',
          admin_notes: 'Doctor skipped certificate upload during registration'
        });

      if (insertError) {
        console.error('Error creating certificate placeholder:', insertError);
        return NextResponse.json(
          { error: 'Failed to mark certificate as skipped' },
          { status: 500 }
        );
      }
    }

    // Update user's approval status to pending
    const { error: updateError } = await supabase
      .from('users')
      .update({
        approval_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating doctor status:', updateError);
      return NextResponse.json(
        { error: 'Failed to update status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Certificate upload skipped. You can upload later from your dashboard.'
    });

  } catch (error) {
    console.error('Skip certificate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
