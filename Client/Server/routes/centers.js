// Center-Specific Scheduling Routes
// This file provides center-specific scheduling endpoints

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get all medical centers
router.get('/', async (req, res) => {
  try {
    const { specialty } = req.query;


    const { data: centers, error } = await supabase
      .from('centers')
      .select('*')
      .order('name');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch centers' });
    }

    // Filter by specialty if needed (this would require a centers_specialties table)
    let filteredCenters = centers || [];

    // Add counts of doctors per center if needed
    for (let center of filteredCenters) {
      const { data: doctorCount, error: countError } = await supabase
        .from('doctor_centers')
        .select('id', { count: 'exact' })
        .eq('center_id', center.id);

      center.doctor_count = doctorCount?.length || 0;
    }

    res.json({
      success: true,
      specialty: specialty || null,
      centers: filteredCenters
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctors by center and specialty
router.get('/:centerId/doctors', async (req, res) => {
  try {
    const { centerId } = req.params;
    const { specialty, home_visit } = req.query;


    let query = supabase
      .from('doctor_centers')
      .select(`
        *,
        users!inner(
          id,
          name,
          first_name,
          last_name,
          specialty,
          consultation_fee,
          rating,
          profile_picture,
          home_visits_available,
          bio,
          experience_years
        )
      `)
      .eq('center_id', centerId);

    // If home_visit is requested, filter for doctors with home visits enabled
    if (home_visit === 'true') {
      query = query.eq('users.home_visits_available', true);
    }

    const { data: doctorCenters, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch doctors' });
    }

    // Filter by specialty if provided and format response
    let doctors = doctorCenters?.map(dc => ({
      id: dc.users.id,
      name: dc.users.name || `${dc.users.first_name || ''} ${dc.users.last_name || ''}`.trim(),
      specialty: dc.users.specialty,
      consultation_fee: dc.users.consultation_fee,
      rating: dc.users.rating || 4.5,
      profile_picture: dc.users.profile_picture,
      home_visits_available: dc.users.home_visits_available || false,
      bio: dc.users.bio,
      experience_years: dc.users.experience_years || 0,
      is_primary: dc.is_primary
    })) || [];

    if (specialty) {
      doctors = doctors.filter(doctor => 
        doctor.specialty && doctor.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    // Check which doctors have schedules for this center
    for (let doctor of doctors) {
      const { data: schedules } = await supabase
        .from('doctor_schedules')
        .select('id')
        .eq('doctor_id', doctor.id)
        .eq('center_id', centerId)
        .eq('is_available', true)
        .limit(1);

      doctor.has_schedule = schedules && schedules.length > 0;
    }


    res.json({
      success: true,
      center_id: centerId,
      specialty: specialty || null,
      doctors: doctors
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get center details
router.get('/:centerId', async (req, res) => {
  try {
    const { centerId } = req.params;

    const { data: center, error } = await supabase
      .from('centers')
      .select('*')
      .eq('id', centerId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Center not found' });
    }

    // Get doctor count
    const { data: doctorCount } = await supabase
      .from('doctor_centers')
      .select('id', { count: 'exact' })
      .eq('center_id', centerId);

    center.doctor_count = doctorCount?.length || 0;

    res.json({
      success: true,
      center: center
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available specialties at a center
router.get('/:centerId/specialties', async (req, res) => {
  try {
    const { centerId } = req.params;

    const { data: doctors, error } = await supabase
      .from('doctor_centers')
      .select(`
        users!inner(specialty)
      `)
      .eq('center_id', centerId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch specialties' });
    }

    // Extract unique specialties
    const specialties = [...new Set(
      doctors
        .map(d => d.users.specialty)
        .filter(specialty => specialty && specialty.trim())
    )];

    res.json({
      success: true,
      center_id: centerId,
      specialties: specialties
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
