// Doctor-Specific Routes for Center Scheduling
// This file provides doctor-specific endpoints for center scheduling

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Get doctor's available slots for a specific date and center
router.get('/:doctorId/available-slots', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, center_id } = req.query;


    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    // Get the day of week for the requested date
    const requestDate = new Date(date);
    const dayOfWeek = requestDate.getDay();

    // Get doctor's schedule for this day and center
    let scheduleQuery = supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_available', true);

    if (center_id) {
      scheduleQuery = scheduleQuery.eq('center_id', center_id);
    }

    const { data: schedules, error: scheduleError } = await scheduleQuery;

    if (scheduleError) {
      return res.status(500).json({ error: 'Failed to fetch schedule' });
    }

    if (!schedules || schedules.length === 0) {
      '}`);
      return res.json({
        success: true,
        doctor_id: doctorId,
        date: date,
        center_id: center_id || null,
        available_slots: []
      });
    }

    // Get existing appointments for this date
    let appointmentQuery = supabase
      .from('appointments')
      .select('appointment_time')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      // Exclude cancelled/no_show/completed so completed slots are free again
      .not('status', 'in', '(cancelled,no_show,completed)');

  // Don't filter by center_id for appointments — a doctor can't be in two places at once
  // Even if an appointment was booked at a different center (or with null center_id),
  // the doctor is still unavailable at that time slot for ALL centers

    `);

    const { data: appointments, error: appointmentError } = await appointmentQuery;

    if (appointmentError) {
      return res.status(500).json({ error: 'Failed to fetch appointments' });
    }

    // Extract booked times - NORMALIZE TIME FORMAT for proper comparison
    const bookedTimes = new Set(
      appointments?.map(apt => {
        const timeStr = apt.appointment_time;
        // Convert HH:MM:SS to HH:MM for comparison with schedule slots
        const normalizedTime = timeStr.length === 8 ? timeStr.substring(0, 5) : timeStr;
        return normalizedTime;
      }) || []
    );

    );

    // Generate available slots from schedules - KEEP ALL SLOTS, mark booked ones
    const allSlots = [];
    
    schedules.forEach(schedule => {
      if (schedule.time_slots && Array.isArray(schedule.time_slots)) {
        schedule.time_slots.forEach(slot => {
          const isBooked = bookedTimes.has(slot.time);
          ' : 'AVAILABLE (keeping enabled)'}`);
          
          allSlots.push({
            time: slot.time,
            duration: slot.duration || schedule.slot_duration || 30,
            center_id: schedule.center_id,
            is_booked: isBooked,  // Mark booked slots instead of filtering them out
            is_available: !isBooked
          });
        });
      }
    });

    // Sort slots by time
    allSlots.sort((a, b) => a.time.localeCompare(b.time));

    // Count only available slots for the total
    const availableCount = allSlots.filter(slot => slot.is_available).length;

    );

    res.json({
      success: true,
      doctor_id: doctorId,
      date: date,
      center_id: center_id || null,
      day_of_week: dayOfWeek,
      available_slots: allSlots,  // Return ALL slots with booking status
      total_available: availableCount,
      total_slots: allSlots.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's working days for a center
router.get('/:doctorId/working-days', async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { center_id } = req.query;


    let query = supabase
      .from('doctor_schedules')
      .select('day_of_week')
      .eq('doctor_id', doctorId)
      .eq('is_available', true);

    if (center_id) {
      query = query.eq('center_id', center_id);
    }

    const { data: schedules, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch working days' });
    }

    const workingDays = [...new Set(schedules?.map(s => s.day_of_week) || [])];
    workingDays.sort();

    '}: [${workingDays.join(', ')}]`);

    res.json({
      success: true,
      doctor_id: doctorId,
      center_id: center_id || null,
      working_days: workingDays
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's schedule for all centers
router.get('/:doctorId/schedule', async (req, res) => {
  try {
    const { doctorId } = req.params;

    const { data: schedules, error } = await supabase
      .from('doctor_schedules')
      .select(`
        *,
        centers(id, name, address)
      `)
      .eq('doctor_id', doctorId)
      .order('day_of_week');

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch schedule' });
    }

    res.json({
      success: true,
      doctor_id: doctorId,
      schedule: schedules || []
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's centers
router.get('/:doctorId/centers', async (req, res) => {
  try {
    const { doctorId } = req.params;


    const { data: doctorCenters, error } = await supabase
      .from('doctor_centers')
      .select(`
        *,
        centers!inner(id, name, address, phone, email)
      `)
      .eq('doctor_id', doctorId);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch doctor centers' });
    }

    const centers = doctorCenters?.map(dc => ({
      ...dc.centers,
      is_primary: dc.is_primary,
      assignment_date: dc.created_at
    })) || [];

    .join(', ')}]`);

    res.json({
      success: true,
      doctor_id: doctorId,
      centers: centers
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
