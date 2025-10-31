// API endpoints for center-specific doctor available slots
// Route: /api/centers/[centerId]/doctors/[doctorId]/available-slots

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { centerId, doctorId } = req.query;
    const { date, appointment_type } = req.query;

    if (!centerId || !doctorId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Center ID, Doctor ID, and date are required'
      });
    }

    // Verify doctor is associated with this center
    const { data: doctorCenter, error: accessError } = await supabase
      .from('doctor_centers')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();

    if (accessError || !doctorCenter) {
      return res.status(403).json({
        success: false,
        error: 'Doctor not associated with this center'
      });
    }

    // Get day of week for the requested date
    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay();

    // Get doctor's schedule for this center and day
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true)
      .single();

    if (scheduleError || !schedule) {
      return res.status(200).json({
        success: true,
        data: {
          availableSlots: [],
          bookedSlots: [],
          consultationFee: 0,
          message: 'Doctor is not available on this day at this center'
        }
      });
    }

    // Generate time slots based on schedule
    const generateTimeSlots = (startTime, endTime, duration = 30) => {
      const slots = [];
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      
      let current = new Date(start);
      while (current < end) {
        const timeSlot = current.toTimeString().slice(0, 5);
        slots.push(timeSlot);
        current.setMinutes(current.getMinutes() + duration);
      }
      
      return slots;
    };

    const allSlots = generateTimeSlots(schedule.start_time, schedule.end_time);

    // Get booked appointments for this date, doctor, and center
    const { data: bookedAppointments, error: appointmentError } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .eq('appointment_date', date)
      .eq('status', 'scheduled');

    if (appointmentError) {
      console.error('Error fetching booked appointments:', appointmentError);
    }

    const bookedSlots = bookedAppointments ? bookedAppointments.map(apt => apt.appointment_time) : [];
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    // Get consultation fee from schedule or use doctor's default
    let consultationFee = schedule.consultation_fee;
    if (!consultationFee) {
      const { data: doctorData } = await supabase
        .from('doctors')
        .select('consultation_fee')
        .eq('id', doctorId)
        .single();
      
      consultationFee = doctorData?.consultation_fee || 0;
    }

    return res.status(200).json({
      success: true,
      data: {
        availableSlots,
        bookedSlots,
        consultationFee,
        schedule: {
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          maxPatients: schedule.max_patients
        }
      }
    });

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
