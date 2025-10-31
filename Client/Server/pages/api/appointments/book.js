// Enhanced appointment booking API with center support
// Route: /api/appointments/book

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const {
      doctor_id,
      center_id,
      appointment_date,
      appointment_time,
      type,
      symptoms,
      duration = 30
    } = req.body;

    // Validate required fields
    if (!doctor_id || !center_id || !appointment_date || !appointment_time) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: doctor_id, center_id, appointment_date, appointment_time'
      });
    }

    // Verify doctor is associated with the center
    const { data: doctorCenter, error: accessError } = await supabase
      .from('doctor_centers')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('center_id', center_id)
      .single();

    if (accessError || !doctorCenter) {
      return res.status(403).json({
        success: false,
        error: 'Doctor is not associated with this center'
      });
    }

    // Check if the time slot is available
    const appointmentDateTime = new Date(`${appointment_date}T${appointment_time}`);
    const dayOfWeek = appointmentDateTime.getDay();

    // Verify doctor has schedule for this day and center
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctor_id)
      .eq('center_id', center_id)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (scheduleError || !schedule) {
      return res.status(400).json({
        success: false,
        error: 'Doctor is not available on this day at this center'
      });
    }

    // Check if time is within working hours
    const appointmentTime24 = appointment_time;
    if (appointmentTime24 < schedule.start_time || appointmentTime24 >= schedule.end_time) {
      return res.status(400).json({
        success: false,
        error: 'Appointment time is outside doctor\'s working hours'
      });
    }

    // Check for existing appointments at the same time
    const { data: existingAppointment, error: conflictError } = await supabase
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('center_id', center_id)
      .eq('appointment_date', appointment_date)
      .eq('appointment_time', appointment_time)
      .eq('status', 'scheduled')
      .single();

    if (existingAppointment) {
      return res.status(409).json({
        success: false,
        error: 'This time slot is already booked'
      });
    }

    // Get patient ID from request (assuming it's passed or derived from auth)
    // For now, we'll use a placeholder - in real implementation, get from JWT/session
    const patient_id = req.body.patient_id || 'temp-patient-id';

    // Get consultation fee (center-specific or doctor's default)
    let consultation_fee = schedule.consultation_fee;
    if (!consultation_fee) {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('consultation_fee')
        .eq('id', doctor_id)
        .single();
      
      consultation_fee = doctorData?.consultation_fee || 0;
    }

    // Create the appointment
    const { data: appointment, error: createError } = await supabase
      .from('appointments')
      .insert([
        {
          patient_id,
          doctor_id,
          center_id,
          appointment_date,
          appointment_time,
          type: type || 'clinic',
          status: 'scheduled',
          consultation_fee,
          duration,
          symptoms: symptoms || null,
          created_at: new Date().toISOString()
        }
      ])
      .select(`
        id,
        appointment_date,
        appointment_time,
        type,
        status,
        consultation_fee,
        doctors (
          id,
          name,
          specialty
        ),
        centers (
          id,
          name,
          address
        )
      `)
      .single();

    if (createError) {
      console.error('Error creating appointment:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create appointment'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: {
        appointment,
        booking_details: {
          doctor: appointment.doctors.name,
          center: appointment.centers.name,
          date: appointment_date,
          time: appointment_time,
          type: appointment.type,
          fee: consultation_fee
        }
      }
    });

  } catch (error) {
    console.error('Error booking appointment:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
