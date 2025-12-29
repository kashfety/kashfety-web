import express from "express";
import { supabaseAdmin } from "../utils/supabase.js";
import Doctor from "../models/Doctor.js";
import { authenticateToken, isDoctor, isAdmin } from "../middleware/auth.js";

const router = express.Router();

// Doctor Profile Management
router.post("/profile/create", authenticateToken, async (req, res) => {
  try {
    const doctor = await Doctor.createDoctorProfile(req.body);
    res.status(201).json({
      success: true,
      message: "Doctor profile created successfully",
      doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/profile/:uid/details", async (req, res) => {
  try {
    const doctor = await Doctor.getDoctorByUid(req.params.uid);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found"
      });
    }
    res.json({
      success: true,
      doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put("/profile/:uid/update", authenticateToken, isDoctor, async (req, res) => {
  try {
    const updatedDoctor = await Doctor.updateDoctorProfile(req.params.uid, req.body);
    res.json({
      success: true,
      message: "Doctor profile updated successfully",
      doctor: updatedDoctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Directory & Discovery
router.get("/directory/all-active", async (req, res) => {
  try {
    const doctors = await Doctor.getAllActiveDoctors();
    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/directory/by-specialty/:specialty", async (req, res) => {
  try {
    const doctors = await Doctor.getDoctorsBySpecialty(req.params.specialty);
    res.json({
      success: true,
      doctors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Availability Management
router.get("/availability/:doctorId/schedule", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const availability = await Doctor.getDoctorAvailability(
      req.params.doctorId, 
      startDate || new Date().toISOString().split('T')[0],
      endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );
    res.json({
      success: true,
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put("/availability/:doctorId/update", authenticateToken, isDoctor, async (req, res) => {
  try {
    const availability = await Doctor.updateDoctorAvailability(req.params.doctorId, req.body);
    res.json({
      success: true,
      message: "Availability updated successfully",
      availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Appointments Management
router.get("/appointments/:doctorId/all", authenticateToken, isDoctor, async (req, res) => {
  try {
    const { status } = req.query;
    const appointments = await Doctor.getDoctorAppointments(req.params.doctorId, status);
    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/appointments/:doctorId/today", authenticateToken, isDoctor, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        patients(name, age, gender, phone)
      `)
      .eq('doctor_id', req.params.doctorId)
      .eq('appointment_date', today)
      .order('appointment_time');

    if (error) throw error;

    res.json({
      success: true,
      appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Schedule Management
router.get("/schedule/:doctorId/working-hours", async (req, res) => {
  try {
    const { data: schedules, error } = await supabaseAdmin
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', req.params.doctorId)
      .order('day_of_week');

    if (error) throw error;

    res.json({
      success: true,
      schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put("/schedule/:doctorId/working-hours", authenticateToken, isDoctor, async (req, res) => {
  try {
    const { schedules } = req.body;
    
    // Delete existing schedules
    await supabaseAdmin
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', req.params.doctorId);

    // Insert new schedules
    const { data, error } = await supabaseAdmin
      .from('doctor_schedules')
      .insert(schedules.map(schedule => ({
        ...schedule,
        doctor_id: req.params.doctorId
      })))
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Working hours updated successfully",
      schedules: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Reviews & Ratings
router.get("/reviews/:doctorId/all", async (req, res) => {
  try {
    const { data: reviews, error } = await supabaseAdmin
      .from('doctor_reviews')
      .select(`
        *,
        patients(name)
      `)
      .eq('doctor_id', req.params.doctorId)
      .eq('is_verified', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Doctor Centers Management
router.get("/centers/:doctorId/affiliated", async (req, res) => {
  try {
    const { data: centers, error } = await supabaseAdmin
      .from('doctor_centers')
      .select(`
        *,
        centers(*)
      `)
      .eq('doctor_id', req.params.doctorId);

    if (error) throw error;

    res.json({
      success: true,
      centers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/centers/:doctorId/affiliate", authenticateToken, isDoctor, async (req, res) => {
  try {
    const { center_id, is_primary } = req.body;
    
    const { data, error } = await supabaseAdmin
      .from('doctor_centers')
      .insert([{
        doctor_id: req.params.doctorId,
        center_id,
        is_primary: is_primary || false
      }])
      .select();

    if (error) throw error;

    res.json({
      success: true,
      message: "Center affiliation added successfully",
      affiliation: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
