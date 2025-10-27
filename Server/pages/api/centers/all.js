// API endpoints for listing all medical centers
// Route: /api/centers/all

import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Get all medical centers with basic information
    const { data: centers, error } = await supabase
      .from('centers')
      .select(`
        id,
        name,
        address,
        phone,
        operating_hours,
        services,
        created_at
      `)
      .order('name');

    if (error) {
      console.error('Error fetching centers:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch medical centers'
      });
    }

    // Get doctor count for each center
    const centerIds = centers?.map(c => c.id) || [];
    let centerDoctorCounts = {};

    if (centerIds.length > 0) {
      const { data: doctorCounts } = await supabase
        .from('doctor_centers')
        .select('center_id, doctor_id')
        .in('center_id', centerIds);

      if (doctorCounts) {
        centerDoctorCounts = doctorCounts.reduce((acc, dc) => {
          acc[dc.center_id] = (acc[dc.center_id] || 0) + 1;
          return acc;
        }, {});
      }
    }

    // Enhance centers with doctor counts and parsed data
    const enhancedCenters = centers?.map(center => ({
      ...center,
      doctor_count: centerDoctorCounts[center.id] || 0,
      operating_hours: typeof center.operating_hours === 'string' 
        ? JSON.parse(center.operating_hours) 
        : center.operating_hours,
      services: Array.isArray(center.services) 
        ? center.services 
        : (center.services ? JSON.parse(center.services) : [])
    })) || [];

    return res.status(200).json({
      success: true,
      centers: enhancedCenters,
      total: enhancedCenters.length
    });

  } catch (error) {
    console.error('Error fetching centers:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
