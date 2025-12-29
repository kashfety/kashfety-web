// API endpoints for doctor's associated centers
// Route: /api/doctors/[doctorId]/centers

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { doctorId } = req.query;

    if (!doctorId) {
      return res.status(400).json({
        success: false,
        error: 'Doctor ID is required'
      });
    }

    // Get centers associated with this doctor
    const { data: doctorCenters, error } = await supabase
      .from('doctor_centers')
      .select(`
        center_id,
        created_at,
        centers (
          id,
          name,
          address,
          phone,
          operating_hours,
          services
        )
      `)
      .eq('doctor_id', doctorId);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch doctor centers'
      });
    }

    if (!doctorCenters || doctorCenters.length === 0) {
      return res.status(200).json({
        success: true,
        centers: [],
        message: 'Doctor is not associated with any centers'
      });
    }

    // Get doctor's schedules for each center
    const centerIds = doctorCenters.map(dc => dc.center_id);
    const { data: schedules } = await supabase
      .from('doctor_schedules')
      .select('center_id, day_of_week, start_time, end_time, consultation_fee, is_available')
      .eq('doctor_id', doctorId)
      .in('center_id', centerIds)
      .eq('is_available', true);

    // Group schedules by center
    const schedulesByCenter = {};
    if (schedules) {
      schedules.forEach(schedule => {
        if (!schedulesByCenter[schedule.center_id]) {
          schedulesByCenter[schedule.center_id] = [];
        }
        schedulesByCenter[schedule.center_id].push(schedule);
      });
    }

    // Enhance centers with schedule information
    const enhancedCenters = doctorCenters.map(dc => ({
      ...dc.centers,
      association_date: dc.created_at,
      schedule: schedulesByCenter[dc.center_id] || [],
      has_schedule: (schedulesByCenter[dc.center_id] || []).length > 0,
      operating_hours: typeof dc.centers.operating_hours === 'string' 
        ? JSON.parse(dc.centers.operating_hours) 
        : dc.centers.operating_hours,
      services: Array.isArray(dc.centers.services) 
        ? dc.centers.services 
        : (dc.centers.services ? JSON.parse(dc.centers.services) : [])
    }));

    return res.status(200).json({
      success: true,
      centers: enhancedCenters,
      total: enhancedCenters.length,
      centers_with_schedule: enhancedCenters.filter(c => c.has_schedule).length
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
