// Utility functions for appointment management

import { supabaseAdmin } from "./supabase.js";

/**
 * Mark past appointments as absent
 * Updates appointments with status 'scheduled' or 'confirmed' that have passed their appointment time
 * Sets status to 'cancelled' with cancellation_reason 'absent'
 * 
 * @param {string} doctorId - Optional: Filter by specific doctor ID
 * @param {string} patientId - Optional: Filter by specific patient ID
 * @returns {Promise<Object>} - Returns count of updated appointments and any errors
 */
export async function markPastAppointmentsAsAbsent(doctorId = null, patientId = null) {
  try {
    
    // Get current date and time in ISO format
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentTime = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
    

    // Build query to find past appointments that are still scheduled or confirmed
    let query = supabaseAdmin
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
      return { success: false, error: fetchError.message, updatedCount: 0 };
    }

    if (!appointments || appointments.length === 0) {
      return { success: true, updatedCount: 0 };
    }


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
        return false;
      }
    });

    if (pastAppointments.length === 0) {
      return { success: true, updatedCount: 0 };
    }


    // Extract IDs of appointments to update
    const appointmentIds = pastAppointments.map(apt => apt.id);

    // Update all past appointments in one query
    const { data: updatedAppointments, error: updateError } = await supabaseAdmin
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: 'absent',
        updated_at: now.toISOString()
      })
      .in('id', appointmentIds)
      .select('id');

    if (updateError) {
      return { success: false, error: updateError.message, updatedCount: 0 };
    }

    const updatedCount = updatedAppointments?.length || 0;

    return { 
      success: true, 
      updatedCount,
      updatedIds: updatedAppointments?.map(apt => apt.id) || []
    };

  } catch (error) {
    return { 
      success: false, 
      error: error.message, 
      updatedCount: 0 
    };
  }
}

/**
 * Check if a single appointment should be marked as absent
 * @param {Object} appointment - Appointment object with date and time
 * @returns {boolean} - True if appointment is in the past and should be marked absent
 */
export function isAppointmentAbsent(appointment) {
  if (!appointment || appointment.status !== 'scheduled' && appointment.status !== 'confirmed') {
    return false;
  }

  try {
    const aptDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const now = new Date();
    return aptDateTime < now;
  } catch (e) {
    return false;
  }
}

export default {
  markPastAppointmentsAsAbsent,
  isAppointmentAbsent
};

