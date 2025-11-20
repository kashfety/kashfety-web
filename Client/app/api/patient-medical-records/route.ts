import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET: Fetch all medical records for a patient
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    console.log('📋 [Patient Medical Records] Fetching for patient:', patientId);

    // Get medical records for this patient with doctor information
    const { data: records, error } = await supabase
      .from('medical_records')
      .select(`
        id,
        patient_id,
        doctor_id,
        appointment_id,
        record_type,
        title,
        description,
        diagnosis,
        treatment,
        prescription,
        lab_results,
        attachments,
        record_date,
        created_at,
        updated_at,
        allergies,
        medications,
        medical_history,
        doctor:users!medical_records_doctor_id_fkey(id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, specialty)
      `)
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching medical records:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to fetch medical records',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Patient Medical Records] Found', records?.length || 0, 'records');
    return NextResponse.json({
      success: true,
      records: records || []
    });

  } catch (error: any) {
    console.error('❌ Patient medical records error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// POST: Create a new medical record
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      patient_id, 
      doctor_id, 
      appointment_id,
      record_type,
      title,
      description,
      diagnosis, 
      treatment, 
      prescription,
      lab_results,
      attachments,
      allergies,
      medications,
      medical_history,
      record_date 
    } = body;

    if (!patient_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient ID is required' 
      }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ 
        success: false, 
        error: 'Title is required' 
      }, { status: 400 });
    }

    console.log('📝 [Patient Medical Records] Creating record for patient:', patient_id);

    // Create medical record
    const { data: record, error } = await supabase
      .from('medical_records')
      .insert({
        patient_id,
        doctor_id: doctor_id || null,
        appointment_id: appointment_id || null,
        record_type: record_type || 'consultation',
        title,
        description: description || null,
        diagnosis: diagnosis || null,
        treatment: treatment || null,
        prescription: prescription || null,
        lab_results: lab_results || null,
        attachments: attachments || null,
        allergies: allergies || null,
        medications: medications || null,
        medical_history: medical_history || null,
        record_date: record_date || new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        id,
        patient_id,
        doctor_id,
        appointment_id,
        record_type,
        title,
        description,
        diagnosis,
        treatment,
        prescription,
        lab_results,
        attachments,
        allergies,
        medications,
        medical_history,
        record_date,
        created_at,
        updated_at,
        doctor:users!medical_records_doctor_id_fkey(id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, specialty)
      `)
      .single();

    if (error) {
      console.error('❌ Error creating medical record:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create medical record',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Patient Medical Records] Record created successfully:', record.id);
    return NextResponse.json({
      success: true,
      message: 'Medical record created successfully',
      record
    });

  } catch (error: any) {
    console.error('❌ Patient medical records POST error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// PUT: Update a medical record
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      record_id,
      record_type,
      title,
      description,
      diagnosis, 
      treatment, 
      prescription,
      lab_results,
      attachments,
      allergies,
      medications,
      medical_history,
      record_date 
    } = body;

    if (!record_id) {
      return NextResponse.json({ 
        success: false, 
        error: 'Record ID is required' 
      }, { status: 400 });
    }

    console.log('📝 [Patient Medical Records] Updating record:', record_id);

    // Build update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (record_type !== undefined) updateData.record_type = record_type;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis;
    if (treatment !== undefined) updateData.treatment = treatment;
    if (prescription !== undefined) updateData.prescription = prescription;
    if (lab_results !== undefined) updateData.lab_results = lab_results;
    if (attachments !== undefined) updateData.attachments = attachments;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (medications !== undefined) updateData.medications = medications;
    if (medical_history !== undefined) updateData.medical_history = medical_history;
    if (record_date !== undefined) updateData.record_date = record_date;

    // Update medical record
    const { data: record, error } = await supabase
      .from('medical_records')
      .update(updateData)
      .eq('id', record_id)
      .select(`
        id,
        patient_id,
        doctor_id,
        appointment_id,
        record_type,
        title,
        description,
        diagnosis,
        treatment,
        prescription,
        lab_results,
        attachments,
        allergies,
        medications,
        medical_history,
        record_date,
        created_at,
        updated_at,
        doctor:users!medical_records_doctor_id_fkey(id, name, name_ar, first_name, last_name, first_name_ar, last_name_ar, specialty)
      `)
      .single();

    if (error) {
      console.error('❌ Error updating medical record:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to update medical record',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Patient Medical Records] Record updated successfully:', record.id);
    return NextResponse.json({
      success: true,
      message: 'Medical record updated successfully',
      record
    });

  } catch (error: any) {
    console.error('❌ Patient medical records PUT error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE: Delete a medical record
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('record_id');

    if (!recordId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Record ID is required' 
      }, { status: 400 });
    }

    console.log('🗑️ [Patient Medical Records] Deleting record:', recordId);

    // Delete medical record
    const { error } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('❌ Error deleting medical record:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to delete medical record',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Patient Medical Records] Record deleted successfully:', recordId);
    return NextResponse.json({
      success: true,
      message: 'Medical record deleted successfully'
    });

  } catch (error: any) {
    console.error('❌ Patient medical records DELETE error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

