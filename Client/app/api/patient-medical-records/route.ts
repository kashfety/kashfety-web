import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, AuthenticatedUser } from '@/lib/api-auth-utils';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET: Fetch all medical records for a patient
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const patientId = searchParams.get('patient_id');

    if (!patientId) {
      return NextResponse.json({
        success: false,
        error: 'Patient ID is required'
      }, { status: 400 });
    }

    // Role-based access control:
    // - Patients can only see their own records
    // - Doctors can only see records for patients who booked with them
    // - Admins can see all records
    if (user.role === 'patient') {
      if (patientId !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only access your own medical records'
        }, { status: 403 });
      }
    } else if (user.role === 'doctor') {
      // Check if doctor has any appointments with this patient
      const { data: appointments, error: appointmentCheckError } = await supabase
        .from('appointments')
        .select('id')
        .eq('doctor_id', user.id)
        .eq('patient_id', patientId)
        .limit(1);

      if (appointmentCheckError || !appointments || appointments.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only access records for patients who booked with you'
        }, { status: 403 });
      }
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Insufficient permissions'
      }, { status: 403 });
    }


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
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch medical records',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      records: records || []
    });

  } catch (error: any) {
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
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user } = authResult;

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

    // Role-based access control:
    // - Patients can create records for themselves
    // - Doctors can create records for patients who booked with them
    // - Admins can create records for any patient
    if (user.role === 'patient') {
      if (patient_id !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only create records for yourself'
        }, { status: 403 });
      }
    } else if (user.role === 'doctor') {
      // If doctor_id is provided, it must match the authenticated doctor
      if (doctor_id && doctor_id !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - Invalid doctor ID'
        }, { status: 403 });
      }

      // If appointment_id is provided, verify the doctor is assigned to it
      if (appointment_id) {
        const { data: appointment, error: appointmentError } = await supabase
          .from('appointments')
          .select('doctor_id, patient_id')
          .eq('id', appointment_id)
          .single();

        if (appointmentError || !appointment) {
          return NextResponse.json({
            success: false,
            error: 'Appointment not found'
          }, { status: 404 });
        }

        if (appointment.doctor_id !== user.id) {
          return NextResponse.json({
            success: false,
            error: 'Forbidden - You can only create records for your own appointments'
          }, { status: 403 });
        }

        if (appointment.patient_id !== patient_id) {
          return NextResponse.json({
            success: false,
            error: 'Forbidden - Patient ID does not match appointment'
          }, { status: 403 });
        }
      } else {
        // If no appointment_id, check if doctor has any appointments with this patient
        const { data: appointments, error: appointmentCheckError } = await supabase
          .from('appointments')
          .select('id')
          .eq('doctor_id', user.id)
          .eq('patient_id', patient_id)
          .limit(1);

        if (appointmentCheckError || !appointments || appointments.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Forbidden - You can only create records for patients who booked with you'
          }, { status: 403 });
        }
      }
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Insufficient permissions'
      }, { status: 403 });
    }


    // Create medical record
    const { data: record, error } = await supabase
      .from('medical_records')
      .insert({
        patient_id,
        doctor_id: doctor_id || (user.role === 'doctor' ? user.id : null),
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
      return NextResponse.json({
        success: false,
        error: 'Failed to create medical record',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medical record created successfully',
      record
    });

  } catch (error: any) {
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
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user } = authResult;

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

    // First, get the existing record to check permissions
    const { data: existingRecord, error: fetchError } = await supabase
      .from('medical_records')
      .select('patient_id, doctor_id')
      .eq('id', record_id)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json({
        success: false,
        error: 'Medical record not found'
      }, { status: 404 });
    }

    // Role-based access control:
    // - Patients can only update their own records
    // - Doctors can only update records for patients who booked with them
    // - Admins can update any record
    if (user.role === 'patient') {
      if (existingRecord.patient_id !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only update your own medical records'
        }, { status: 403 });
      }
    } else if (user.role === 'doctor') {
      if (existingRecord.doctor_id !== user.id) {
        // Check if doctor has appointments with this patient
        const { data: appointments, error: appointmentCheckError } = await supabase
          .from('appointments')
          .select('id')
          .eq('doctor_id', user.id)
          .eq('patient_id', existingRecord.patient_id)
          .limit(1);

        if (appointmentCheckError || !appointments || appointments.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Forbidden - You can only update records for patients who booked with you'
          }, { status: 403 });
        }
      }
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Insufficient permissions'
      }, { status: 403 });
    }


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
      return NextResponse.json({
        success: false,
        error: 'Failed to update medical record',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medical record updated successfully',
      record
    });

  } catch (error: any) {
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
    // Require authentication
    const authResult = requireAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult; // Returns 401 error
    }
    const { user } = authResult;

    const { searchParams } = new URL(request.url);
    const recordId = searchParams.get('record_id');

    if (!recordId) {
      return NextResponse.json({
        success: false,
        error: 'Record ID is required'
      }, { status: 400 });
    }

    // First, get the existing record to check permissions
    const { data: existingRecord, error: fetchError } = await supabase
      .from('medical_records')
      .select('patient_id, doctor_id')
      .eq('id', recordId)
      .single();

    if (fetchError || !existingRecord) {
      return NextResponse.json({
        success: false,
        error: 'Medical record not found'
      }, { status: 404 });
    }

    // Role-based access control:
    // - Patients can only delete their own records
    // - Doctors can only delete records for patients who booked with them
    // - Admins can delete any record
    if (user.role === 'patient') {
      if (existingRecord.patient_id !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'Forbidden - You can only delete your own medical records'
        }, { status: 403 });
      }
    } else if (user.role === 'doctor') {
      if (existingRecord.doctor_id !== user.id) {
        // Check if doctor has appointments with this patient
        const { data: appointments, error: appointmentCheckError } = await supabase
          .from('appointments')
          .select('id')
          .eq('doctor_id', user.id)
          .eq('patient_id', existingRecord.patient_id)
          .limit(1);

        if (appointmentCheckError || !appointments || appointments.length === 0) {
          return NextResponse.json({
            success: false,
            error: 'Forbidden - You can only delete records for patients who booked with you'
          }, { status: 403 });
        }
      }
    } else if (user.role !== 'admin' && user.role !== 'super_admin') {
      return NextResponse.json({
        success: false,
        error: 'Forbidden - Insufficient permissions'
      }, { status: 403 });
    }


    // Delete medical record
    const { error } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      return NextResponse.json({
        success: false,
        error: 'Failed to delete medical record',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Medical record deleted successfully'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}

