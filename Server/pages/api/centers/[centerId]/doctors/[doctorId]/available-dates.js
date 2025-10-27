// API endpoints for center-specific doctor availability
// Route: /api/centers/[centerId]/doctors/[doctorId]/available-dates

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { centerId, doctorId } = req.query;
    const { start_date, end_date } = req.query;

    if (!centerId || !doctorId) {
      return res.status(400).json({
        success: false,
        error: 'Center ID and Doctor ID are required'
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

    // Get doctor's schedule for this center
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .eq('is_available', true);

    if (scheduleError) {
      console.error('Error fetching doctor schedule:', scheduleError);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch doctor schedule'
      });
    }

    if (!schedule || schedule.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          availableDates: [],
          workingDays: [],
          message: `Doctor has not set schedule for this center yet`
        }
      });
    }

    // Extract working days from schedule
    const workingDays = schedule.map(s => s.day_of_week);

    // Generate available dates based on working days
    const availableDates = [];
    const startDate = start_date ? new Date(start_date) : new Date();
    const endDate = end_date ? new Date(end_date) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      if (workingDays.includes(currentDate.getDay())) {
        availableDates.push(currentDate.toISOString().split('T')[0]);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return res.status(200).json({
      success: true,
      data: {
        availableDates,
        workingDays,
        schedule,
        message: `Doctor has ${schedule.length} working days scheduled at this center`
      }
    });

  } catch (error) {
    console.error('Error fetching doctor availability:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
