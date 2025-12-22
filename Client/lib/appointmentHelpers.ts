// Utility functions for appointment management - TypeScript version

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Mark past appointments as absent
 * Updates appointments with status 'scheduled' or 'confirmed' that have passed their appointment time
 * Sets status to 'cancelled' with cancellation_reason 'absent'
 * 
 * @param doctorId - Optional: Filter by specific doctor ID
 * @param patientId - Optional: Filter by specific patient ID
 * @returns Returns count of updated appointments and any errors
 */
export async function markPastAppointmentsAsAbsent(
  doctorId: string | null = null,
  patientId: string | null = null
): Promise<{ success: boolean; updatedCount: number; error?: string; updatedIds?: string[] }> {
  try {
    console.log('🔍 [Mark Absent] Checking for past appointments...');
    
    // Get current date and time in ISO format
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
    
    console.log('🕐 [Mark Absent] Current date/time:', { currentDate, currentTime });

    // Build query to find past appointments that are still scheduled or confirmed
    let query = supabase
      .from('appointments')
      .select('id, appointment_date, appointment_time, status, doctor_id, patient_id');

    // Add filters if provided
    if (doctorId) {
      query = query.eq('doctor_id', doctorId);
    }
    if (patientId) {
      query = query.eq('patient_id', patientId);
    }

    // Filter for scheduled or confirmed appointments
    query = query.in('status', ['scheduled', 'confirmed']);

    const { data: appointments, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ [Mark Absent] Error fetching appointments:', fetchError);
      return { success: false, error: fetchError.message, updatedCount: 0 };
    }

    if (!appointments || appointments.length === 0) {
      console.log('✅ [Mark Absent] No scheduled/confirmed appointments found');
      return { success: true, updatedCount: 0 };
    }

    console.log(`📋 [Mark Absent] Found ${appointments.length} scheduled/confirmed appointments`);

    // Filter appointments to find ones that have passed
    const pastAppointments = appointments.filter(apt => {
      try {
        const aptDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
        const isPast = aptDateTime < now;
        
        if (isPast) {
          console.log(`⏰ [Mark Absent] Past appointment found:`, {
            id: apt.id,
            date: apt.appointment_date,
            time: apt.appointment_time,
            status: apt.status
          });
        }
        
        return isPast;
      } catch (e) {
        console.error('❌ [Mark Absent] Error parsing appointment date/time:', e);
        return false;
      }
    });

    if (pastAppointments.length === 0) {
      console.log('✅ [Mark Absent] No past appointments to mark as absent');
      return { success: true, updatedCount: 0 };
    }

    console.log(`🔄 [Mark Absent] Marking ${pastAppointments.length} appointments as absent...`);

    // Extract IDs of appointments to update
    const appointmentIds = pastAppointments.map(apt => apt.id);

    // Update all past appointments in one query
    const { data: updatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: 'absent',
        updated_at: now.toISOString()
      })
      .in('id', appointmentIds)
      .select('id');

    if (updateError) {
      console.error('❌ [Mark Absent] Error updating appointments:', updateError);
      return { success: false, error: updateError.message, updatedCount: 0 };
    }

    const updatedCount = updatedAppointments?.length || 0;
    console.log(`✅ [Mark Absent] Successfully marked ${updatedCount} appointments as absent`);

    return { 
      success: true, 
      updatedCount,
      updatedIds: updatedAppointments?.map(apt => apt.id) || []
    };

  } catch (error: any) {
    console.error('❌ [Mark Absent] Unexpected error:', error);
    return { 
      success: false, 
      error: error.message, 
      updatedCount: 0 
    };
  }
}

/**
 * Check if a single appointment should be marked as absent
 * @param appointment - Appointment object with date and time
 * @returns True if appointment is in the past and should be marked absent
 */
export function isAppointmentAbsent(appointment: {
  status: string;
  appointment_date: string;
  appointment_time: string;
}): boolean {
  if (!appointment || (appointment.status !== 'scheduled' && appointment.status !== 'confirmed')) {
    return false;
  }

  try {
    const aptDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    return aptDateTime < now;
  } catch (e) {
    console.error('Error checking if appointment is absent:', e);
    return false;
  }
}

