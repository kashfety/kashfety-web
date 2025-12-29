import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedUser } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointment_id');
    const patientId = searchParams.get('patient_id');
    const doctorId = searchParams.get('doctor_id');

    if (!appointmentId) {
      return NextResponse.json({ success: false, message: 'appointment_id is required' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // First, verify the appointment exists and get its details
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('patient_id, doctor_id')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      return NextResponse.json({
        success: false,
        message: 'Appointment not found'
      }, { status: 404 });
    }

    // Role-based access control:
    // - Patients can only see their own records
    // - Doctors can only see records for patients who booked with them
    // - Admins can see all records
    if (user.role === 'patient') {
      if (appointment.patient_id !== user.id) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden - You can only access your own medical records'
        }, { status: 403 });
      }
    } else if (user.role === 'doctor') {
      if (appointment.doctor_id !== user.id) {
        return NextResponse.json({
          success: false,
          message: 'Forbidden - You can only access records for your own patients'
        }, { status: 403 });
      }
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({
        success: false,
        message: 'Forbidden - Insufficient permissions'
      }, { status: 403 });
    }

    let query = supabase
      .from('medical_records')
      .select('id, appointment_id, patient_id, doctor_id, title, description, diagnosis, treatment, prescription, attachments, record_date')
      .eq('appointment_id', appointmentId);

    if (patientId) query = query.eq('patient_id', patientId);
    if (doctorId) query = query.eq('doctor_id', doctorId);

    const { data, error } = await query.order('record_date', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ success: true, records: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to fetch medical records' }, { status: 500 });
  }
}

// POST endpoint for saving patient medical records during signup
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user } = authResult;

    const body = await request.json();
    console.log('📥 [Medical Records] Request body:', body);

    const {
      patient_id,
      allergies,
      medications,
      medical_history,
      emergency_contact,
      medical_records
    } = body;

    // Validate required fields
    if (!patient_id) {
      return NextResponse.json(
        { error: 'patient_id is required', success: false },
        { status: 400 }
      );
    }

    // Role-based access control: Only patients can update their own records, or admins
    if (user.role === 'patient' && user.id !== patient_id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update your own medical records', success: false },
        { status: 403 }
      );
    }

    if (user.role !== 'patient' && user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions', success: false },
        { status: 403 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check if patient exists
    const { data: patientExists, error: patientError } = await supabase
      .from('users')
      .select('id')
      .eq('id', patient_id)
      .eq('role', 'patient')
      .single();

    if (patientError || !patientExists) {
      return NextResponse.json(
        { error: 'Patient not found', success: false },
        { status: 404 }
      );
    }

    // Update patient medical information
    const updateData: any = {};
    if (allergies && Array.isArray(allergies)) updateData.allergies = allergies;
    if (medications && Array.isArray(medications)) updateData.medications = medications;
    if (medical_history && Array.isArray(medical_history)) updateData.medical_history = medical_history;
    if (emergency_contact && typeof emergency_contact === 'object') {
      updateData.emergency_contact = emergency_contact;
    }

    // Update the patient record
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', patient_id);

    if (updateError) {
      console.error('❌ [Medical Records] Update error:', updateError);
      throw new Error(updateError.message || 'Failed to update patient medical records');
    }

    console.log('✅ [Medical Records] Patient medical info updated successfully');

    // Insert medical records if provided
    if (medical_records && Array.isArray(medical_records) && medical_records.length > 0) {
      const recordsToInsert = medical_records.map(record => ({
        id: require('crypto').randomUUID(),
        patient_id,
        title: record.title,
        description: record.description,
        record_type: record.record_type,
        record_date: record.record_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: recordsError } = await supabase
        .from('medical_records')
        .insert(recordsToInsert);

      if (recordsError) {
        console.error('⚠️ [Medical Records] Records insertion error:', recordsError);
        // Don't fail the entire request if records insertion fails
      } else {
        console.log(`✅ [Medical Records] Inserted ${recordsToInsert.length} medical records`);
      }
    }

    return NextResponse.json({
      message: 'Medical records saved successfully',
      success: true
    });

  } catch (error: any) {
    console.error('❌ [Medical Records] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Internal server error',
        success: false
      },
      { status: 500 }
    );
  }
}
