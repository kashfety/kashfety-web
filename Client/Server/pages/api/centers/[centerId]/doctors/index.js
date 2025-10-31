// API endpoints for center-specific doctors listing
// Route: /api/centers/[centerId]/doctors

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { centerId } = req.query;
    const { specialty, home_visit } = req.query;

    if (!centerId) {
      return res.status(400).json({
        success: false,
        error: 'Center ID is required'
      });
    }

    // Build query for doctors associated with the center
    let query = supabase
      .from('doctor_centers')
      .select(`
        doctor_id,
        doctors (
          id,
          name,
          specialty,
          experience_years,
          profile_picture,
          consultation_fee,
          rating,
          home_available
        )
      `)
      .eq('center_id', centerId);

    const { data: doctorCenters, error } = await query;

    if (error) {
      console.error('Error fetching center doctors:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch doctors'
      });
    }

    if (!doctorCenters || doctorCenters.length === 0) {
      return res.status(200).json({
        success: true,
        doctors: [],
        message: 'No doctors found for this center'
      });
    }

    // Extract doctor data and apply filters
    let doctors = doctorCenters
      .map(dc => dc.doctors)
      .filter(doctor => doctor !== null);

    // Filter by specialty if provided
    if (specialty) {
      doctors = doctors.filter(doctor => 
        doctor.specialty.toLowerCase() === specialty.toLowerCase()
      );
    }

    // Filter by home visit availability if requested
    if (home_visit === 'true') {
      doctors = doctors.filter(doctor => doctor.home_available === true);
    }

    // Get doctors with schedules at this center
    const doctorIds = doctors.map(d => d.id);
    if (doctorIds.length > 0) {
      const { data: schedules } = await supabase
        .from('doctor_schedules')
        .select('doctor_id, consultation_fee')
        .eq('center_id', centerId)
        .in('doctor_id', doctorIds)
        .eq('is_available', true);

      // Map center-specific consultation fees
      const centerFees = {};
      if (schedules) {
        schedules.forEach(schedule => {
          if (schedule.consultation_fee) {
            centerFees[schedule.doctor_id] = schedule.consultation_fee;
          }
        });
      }

      // Update doctors with center-specific fees and availability status
      doctors = doctors.map(doctor => ({
        ...doctor,
        consultation_fee: centerFees[doctor.id] || doctor.consultation_fee,
        has_schedule_at_center: schedules?.some(s => s.doctor_id === doctor.id) || false
      }));
    }

    return res.status(200).json({
      success: true,
      doctors,
      filters: {
        centerId,
        specialty: specialty || 'all',
        homeVisit: home_visit === 'true'
      }
    });

  } catch (error) {
    console.error('Error fetching center doctors:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
