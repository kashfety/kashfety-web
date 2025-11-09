import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    console.log('🏥 [Doctor Create Center] Request received');

    // Extract doctor ID from token
    let doctorId = '';
    if (authHeader) {
      try {
        const token = authHeader.replace(/^Bearer\s+/i, '');
        const payload = JSON.parse(Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
        doctorId = payload.id || payload.userId || payload.uid || '';
        console.log('🏥 [Doctor Create Center] Doctor ID:', doctorId);
      } catch (e) {
        console.error('Failed to decode token:', e);
      }
    }

    if (!doctorId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Doctor ID is required' 
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, address, phone, email, center_type, set_as_primary } = body;

    if (!name) {
      return NextResponse.json({ 
        success: false, 
        error: 'Center name is required' 
      }, { status: 400 });
    }

    console.log('🏥 [Doctor Create Center] Creating center:', { name, center_type });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Create the center
    const centerData: any = {
      name,
      address: address || null,
      phone: phone || null,
      email: email || null,
      center_type: center_type || 'generic',
      approval_status: center_type === 'personal' ? 'approved' : 'pending', // Personal clinics auto-approved
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // If it's a personal clinic, set the owner
    if (center_type === 'personal') {
      centerData.owner_doctor_id = doctorId;
    }

    const { data: newCenter, error: createError } = await supabase
      .from('centers')
      .insert(centerData)
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating center:', createError);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create center',
        details: createError.message 
      }, { status: 500 });
    }

    console.log('✅ [Doctor Create Center] Center created:', newCenter.id);

    // Auto-assign the doctor to the center if set_as_primary or if it's their first center
    if (set_as_primary || center_type === 'personal') {
      // Check if doctor has any other centers
      const { data: existingAssignments } = await supabase
        .from('doctor_centers')
        .select('center_id, is_primary')
        .eq('doctor_id', doctorId);

      const hasPrimary = (existingAssignments || []).some((a: any) => a.is_primary);

      // Create assignment
      const { error: assignError } = await supabase
        .from('doctor_centers')
        .insert({
          doctor_id: doctorId,
          center_id: newCenter.id,
          is_primary: set_as_primary && !hasPrimary, // Only set as primary if requested and no other primary exists
          created_at: new Date().toISOString()
        });

      if (assignError) {
        console.error('⚠️ Error auto-assigning center:', assignError);
        // Don't fail the request, just log the error
      } else {
        console.log('✅ [Doctor Create Center] Auto-assigned center to doctor');
      }
    }

    return NextResponse.json({
      success: true,
      message: center_type === 'personal' ? 'Personal clinic created successfully' : 'Center created and pending approval',
      center: newCenter,
      approval_status: centerData.approval_status
    });

  } catch (error: any) {
    console.error('❌ Doctor create center error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

