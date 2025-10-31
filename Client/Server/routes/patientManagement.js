import express from "express";
import { supabaseAdmin } from "../utils/supabase.js";
import Patient from "../models/Patient.js";
import { verifyToken, isPatient, isDoctor, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Patient Profile Management
router.post("/profile/create", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.createPatientProfile(req.body);
    res.status(201).json({
      success: true,
      message: "Patient profile created successfully",
      patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.get("/profile/:uid/details", verifyToken, async (req, res) => {
  try {
    const patient = await Patient.getPatientByUid(req.params.uid);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }
    res.json({
      success: true,
      patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.put("/profile/:uid/update", verifyToken, async (req, res) => {
  try {
    const updatedPatient = await Patient.updatePatientProfile(req.params.uid, req.body);
    res.json({
      success: true,
      message: "Patient profile updated successfully",
      patient: updatedPatient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Medical History
router.get("/medical-history/:uid/records", verifyToken, async (req, res) => {
  try {
    const medicalHistory = await Patient.getPatientMedicalHistory(req.params.uid);
    res.json({
      success: true,
      medical_history: medicalHistory
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

router.post("/medical-history/:patientId/add-record", verifyToken, isDoctor, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('medical_records')
      .insert([{
        patient_id: req.params.patientId,
        doctor_id: req.body.doctor_id,
        appointment_id: req.body.appointment_id,
        record_type: req.body.record_type || 'consultation',
        title: req.body.title,
        description: req.body.description,
        diagnosis: req.body.diagnosis,
        treatment: req.body.treatment,
        prescription: req.body.prescription,
        lab_results: req.body.lab_results || {},
        attachments: req.body.attachments || []
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Medical record added successfully",
      record: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Appointments Management
router.get("/appointments/:patientId/all", verifyToken, async (req, res) => {
  try {
    const { status } = req.query;
    const appointments = await Patient.getPatientAppointments(req.params.patientId, status);
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

router.get("/appointments/:patientId/upcoming", verifyToken, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty, profile_picture, consultation_fee)
      `)
      .eq('patient_id', req.params.patientId)
      .gte('appointment_date', today)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date')
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

router.get("/appointments/:patientId/history", verifyToken, async (req, res) => {
  try {
    const { data: appointments, error } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty, profile_picture)
      `)
      .eq('patient_id', req.params.patientId)
      .in('status', ['completed', 'cancelled'])
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

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

// Patient Dashboard Data
router.get("/dashboard", verifyToken, isPatient, async (req, res) => {
  try {
    // Get patient by authenticated user's UID
    const patient = await Patient.getPatientByUid(req.user.uid);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found"
      });
    }

    // Get upcoming appointments
    const today = new Date().toISOString().split('T')[0];
    const { data: upcomingAppointments } = await supabaseAdmin
      .from('appointments')
      .select(`
        *,
        doctors(name, specialty)
      `)
      .eq('patient_id', patient.id)
      .gte('appointment_date', today)
      .in('status', ['scheduled', 'confirmed'])
      .order('appointment_date')
      .limit(5);

    // Get recent medical records
    const { data: recentRecords } = await supabaseAdmin
      .from('medical_records')
      .select(`
        *,
        doctors(name, specialty)
      `)
      .eq('patient_id', patient.id)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get all appointments for summary calculations
    const { data: allAppointments } = await supabaseAdmin
      .from('appointments')
      .select('*')
      .eq('patient_id', patient.id);

    // Calculate health summary
    const totalAppointments = allAppointments?.length || 0;
    const completedAppointments = allAppointments?.filter(apt => apt.status === 'completed').length || 0;
    const upcomingAppointmentsCount = upcomingAppointments?.length || 0;
    const medicalRecordsCount = recentRecords?.length || 0;
    
    // Get last visit
    const lastCompletedAppointment = allAppointments
      ?.filter(apt => apt.status === 'completed')
      ?.sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date))[0];

    const healthSummary = {
      totalAppointments,
      completedAppointments,
      upcomingAppointments: upcomingAppointmentsCount,
      medicalRecords: medicalRecordsCount,
      lastVisit: lastCompletedAppointment?.appointment_date || null,
      chronicConditions: patient.medical_history?.length || 0,
      allergies: patient.allergies?.length || 0,
      medications: patient.medications?.length || 0
    };

    res.json({
      success: true,
      dashboard: {
        patient,
        upcomingAppointments: upcomingAppointments || [],
        recentRecords: recentRecords || [],
        healthSummary
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Directory (Admin only)
router.get("/directory/all-patients", verifyToken, isAdmin, async (req, res) => {
  try {
    const patients = await Patient.getAllPatients();
    res.json({
      success: true,
      patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Search (Doctor access)
router.get("/search/by-criteria", verifyToken, isDoctor, async (req, res) => {
  try {
    const { name, email, phone } = req.query;
    
    let query = supabaseAdmin
      .from('patients')
      .select(`
        *,
        users(name, email, phone)
      `);

    if (name) {
      query = query.ilike('name', `%${name}%`);
    }
    if (email) {
      query = query.ilike('email', `%${email}%`);
    }
    if (phone) {
      query = query.ilike('users.phone', `%${phone}%`);
    }

    const { data: patients, error } = await query.limit(20);

    if (error) throw error;

    res.json({
      success: true,
      patients
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Patient Reviews for Doctors
router.post("/reviews/:patientId/create", verifyToken, isPatient, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('doctor_reviews')
      .insert([{
        patient_id: req.params.patientId,
        doctor_id: req.body.doctor_id,
        appointment_id: req.body.appointment_id,
        rating: req.body.rating,
        review_text: req.body.review_text,
        bedside_manner_rating: req.body.bedside_manner_rating,
        waiting_time_rating: req.body.waiting_time_rating,
        clinic_environment_rating: req.body.clinic_environment_rating,
        is_anonymous: req.body.is_anonymous || false
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review: data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

export default router;
