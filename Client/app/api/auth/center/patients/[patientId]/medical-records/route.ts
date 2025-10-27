import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params;

    if (!patientId) {
      return NextResponse.json({ error: 'Patient ID is required' }, { status: 400 });
    }

    // Get patient's registration and medical information (not consultation history)
    const { data: medicalRecords, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        gender,
        date_of_birth,
        medical_history,
        allergies,
        medications,
        emergency_contact,
        created_at,
        updated_at
      `)
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (error) {
      console.error('Failed to fetch medical records:', error);
      return NextResponse.json({ error: 'Failed to fetch medical records' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      medicalRecords: medicalRecords ? [medicalRecords] : []
    });

  } catch (error) {
    console.error('Medical records API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
