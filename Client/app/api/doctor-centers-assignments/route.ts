import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🏥 [Doctor Centers Assignments] Request received');

    // Extract doctor ID from token
    let doctorId = '';
    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        doctorId = payload.id || payload.userId || payload.uid || '';
        console.log('🏥 [Doctor Centers Assignments] Doctor ID:', doctorId);
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    const body = await request.json();
    const { center_ids, primary_center_id } = body;

    // Use doctor_id from body if provided (fallback)
    const finalDoctorId = doctorId || body.doctor_id;

    if (!finalDoctorId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Doctor ID is required' 
      }, { status: 400 });
    }

    if (!center_ids || !Array.isArray(center_ids) || center_ids.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'At least one center must be selected' 
      }, { status: 400 });
    }

    console.log('🏥 [Doctor Centers Assignments] Updating assignments:', { 
      doctorId: finalDoctorId, 
      centerIds: center_ids, 
      primaryCenterId: primary_center_id 
    });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Delete all existing assignments for this doctor
    const { error: deleteError } = await supabase
      .from('doctor_centers')
      .delete()
      .eq('doctor_id', finalDoctorId);

    if (deleteError) {
      console.error('❌ Error deleting existing assignments:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update assignments',
        details: deleteError.message 
      }, { status: 500 });
    }

    // Insert new assignments
    const assignments = center_ids.map((centerId: string) => ({
      doctor_id: finalDoctorId,
      center_id: centerId,
      is_primary: centerId === primary_center_id,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('doctor_centers')
      .insert(assignments);

    if (insertError) {
      console.error('❌ Error inserting assignments:', insertError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save assignments',
        details: insertError.message 
      }, { status: 500 });
    }

    console.log('✅ [Doctor Centers Assignments] Assignments saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Center assignments updated successfully'
    });

  } catch (error: any) {
    console.error('❌ Doctor centers assignments error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

