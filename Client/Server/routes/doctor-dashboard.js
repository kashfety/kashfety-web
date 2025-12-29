// Comprehensive Doctor Dashboard API Routes
// This file contains all the endpoints needed for the doctor dashboard

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { authenticateToken } from '../middleware/auth.js';
import { markPastAppointmentsAsAbsent } from '../utils/appointmentHelpers.js';

dotenv.config();

const router = express.Router();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to get doctor profile
async function getDoctorProfile(doctorId) {
  const { data: doctor, error } = await supabase
    .from('users')
    .select(`
      *,
      name_ar,
      first_name_ar,
      last_name_ar
    `)
    .eq('id', doctorId)
    .eq('role', 'doctor')
    .single();

  if (error) throw error;

  console.log('🔍 Doctor data from DB:', {
    name: doctor?.name,
    name_ar: doctor?.name_ar,
    first_name_ar: doctor?.first_name_ar,
    last_name_ar: doctor?.last_name_ar,
    specialty: doctor?.specialty
  });

  // If doctor has specialty text, try to get the corresponding specialty data
  if (doctor && doctor.specialty) {
    const { data: specialtyData } = await supabase
      .from('specialties')
      .select('name, name_ar, name_en, name_ku')
      .eq('name', doctor.specialty)
      .single();


    if (specialtyData) {
      doctor.specialty_name = specialtyData.name;
      doctor.specialty_name_ar = specialtyData.name_ar;
      doctor.specialty_name_en = specialtyData.name_en;
      doctor.specialty_name_ku = specialtyData.name_ku;
    }
  }

  return doctor;
}

// Get doctor profile - /api/doctor-dashboard/profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const doctor = await getDoctorProfile(req.user.id);

    // Remove password from response
    const { password, ...doctorWithoutPassword } = doctor;

    res.json({
      success: true,
      doctor: doctorWithoutPassword
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor profile - /api/doctor-dashboard/profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const {
      name,
      specialty,
      bio,
      experience_years,
      consultation_fee,
      qualifications
    } = req.body;

    // Validate consultation fee
    if (consultation_fee !== undefined && (consultation_fee < 0 || consultation_fee > 10000)) {
      return res.status(400).json({
        error: 'Consultation fee must be between $0 and $10,000'
      });
    }

    // Prepare update data
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Only include fields that are provided
    if (name !== undefined) updateData.name = name;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (bio !== undefined) updateData.bio = bio;
    if (experience_years !== undefined) updateData.experience_years = experience_years;
    if (consultation_fee !== undefined) updateData.consultation_fee = consultation_fee;
    if (qualifications !== undefined) updateData.qualifications = qualifications;

    const { data: updatedDoctor, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .eq('role', 'doctor')
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update doctor profile' });
    }

    // Remove password from response
    const { password, ...doctorWithoutPassword } = updatedDoctor;

    res.json({
      success: true,
      message: 'Doctor profile updated successfully',
      doctor: doctorWithoutPassword
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get today's stats and appointments - /api/doctor-dashboard/today-stats
router.get('/today-stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];

    // Get today's appointments with patient details
    const { data: todayAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_time,
        appointment_date,
        status,
        type,
        appointment_type,
        consultation_fee,
        symptoms,
        chief_complaint,
        patient_id,
        patient_name:users!fk_appointments_patient(name, name_ar, first_name, first_name_ar, last_name, last_name_ar)
      `)
      .eq('doctor_id', req.user.id)
      .gte('appointment_date', today)
      .lte('appointment_date', nextWeekDate)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (appointmentsError) {

      // Fallback: Get appointments without patient name join
      const { data: fallbackAppointments, error: fallbackError } = await supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', req.user.id)
        .gte('appointment_date', today)
        .lte('appointment_date', nextWeekDate)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (fallbackError) {
        return res.status(500).json({ error: 'Failed to fetch upcoming appointments' });
      }

      // Get patient names separately
      const appointmentsWithNames = [];
      for (const apt of fallbackAppointments || []) {
        const { data: patient } = await supabase
          .from('users')
          .select('name')
          .eq('id', apt.patient_id)
          .eq('role', 'patient')
          .single();

        appointmentsWithNames.push({
          ...apt,
          patient_name: patient?.name || 'Unknown Patient'
        });
      }

      // Calculate stats with fallback data
      return calculateAndSendStats(res, appointmentsWithNames, today);
    }

    // Process successful response
    const formattedAppointments = todayAppointments?.map(apt => ({
      id: apt.id,
      appointment_time: apt.appointment_time,
      appointment_date: apt.appointment_date,
      patient_name: apt.patient_name?.name || 'Unknown Patient',
      patient_name_ar: apt.patient_name?.name_ar || null,
      patient_first_name: apt.patient_name?.first_name || null,
      patient_first_name_ar: apt.patient_name?.first_name_ar || null,
      patient_last_name: apt.patient_name?.last_name || null,
      patient_last_name_ar: apt.patient_name?.last_name_ar || null,
      patient_id: apt.patient_id,
      type: apt.type,
      appointment_type: apt.appointment_type,
      status: apt.status,
      symptoms: apt.symptoms,
      chief_complaint: apt.chief_complaint,
      consultation_fee: apt.consultation_fee || 0
    })) || [];

    calculateAndSendStats(res, formattedAppointments, today);

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate and send stats
function calculateAndSendStats(res, appointments, today = null) {
  const todayDate = today || new Date().toISOString().split('T')[0];

  // Filter for today's appointments specifically for stats
  const todayAppointments = appointments.filter(apt => apt.appointment_date === todayDate);
  const completedToday = todayAppointments.filter(apt => apt.status === 'completed');
  const totalRevenue = completedToday.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);

  // Find next upcoming appointment (from all appointments)
  const currentDateTime = new Date();
  const nextAppointment = appointments.find(apt => {
    const appointmentDateTime = new Date(`${apt.appointment_date}T${apt.appointment_time}`);
    return appointmentDateTime > currentDateTime && ['scheduled', 'confirmed'].includes(apt.status);
  });

  res.json({
    success: true,
    stats: {
      todayAppointments: todayAppointments.length,
      todayCompleted: completedToday.length,
      todayRevenue: totalRevenue,
      nextAppointment: nextAppointment ? {
        patient_name: nextAppointment.patient_name,
        time: nextAppointment.appointment_time,
        date: nextAppointment.appointment_date,
        type: nextAppointment.type || nextAppointment.appointment_type
      } : null
    },
    appointments: appointments.slice(0, 10) // Return upcoming appointments for display
  });
}

// Get doctor's patients - /api/doctor-dashboard/patients
router.get('/patients', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const limit = parseInt(req.query.limit) || 50;

    // Get patients who have appointments with this doctor
    const { data: patientAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        patient_id,
        appointment_date,
        status,
        users!fk_appointments_patient (
          id,
          name,
          name_ar,
          first_name,
          first_name_ar,
          last_name,
          last_name_ar,
          email,
          phone,
          gender,
          date_of_birth,
          created_at
        )
      `)
      .eq('doctor_id', req.user.id)
      .order('appointment_date', { ascending: false });

    if (appointmentsError) {

      // Fallback approach: Get appointments and patient details separately
      const { data: simpleAppointments } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date, status')
        .eq('doctor_id', req.user.id)
        .order('appointment_date', { ascending: false });

      if (!simpleAppointments) {
        return res.json({ success: true, patients: [], count: 0 });
      }

      // Get unique patient IDs
      const uniquePatientIds = [...new Set(simpleAppointments.map(apt => apt.patient_id))];

      // Get patient details
      const { data: patients } = await supabase
        .from('users')
        .select('id, name, name_ar, first_name, first_name_ar, last_name, last_name_ar, email, phone, gender, date_of_birth, created_at')
        .in('id', uniquePatientIds)
        .eq('role', 'patient');

      // Calculate patient stats
      const patientsWithStats = patients?.map(patient => {
        const patientAppointments = simpleAppointments.filter(apt => apt.patient_id === patient.id);
        const lastAppointment = patientAppointments[0]?.appointment_date;
        const age = patient.date_of_birth ?
          new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;

        return {
          id: patient.id,
          name: patient.name,
          name_ar: patient.name_ar,
          first_name: patient.first_name,
          first_name_ar: patient.first_name_ar,
          last_name: patient.last_name,
          last_name_ar: patient.last_name_ar,
          email: patient.email,
          phone: patient.phone,
          age,
          gender: patient.gender,
          created_at: patient.created_at,
          lastAppointment,
          totalAppointments: patientAppointments.length
        };
      }).slice(0, limit) || [];

      return res.json({
        success: true,
        patients: patientsWithStats,
        count: patientsWithStats.length
      });
    }

    // Process successful response with joins
    const patientMap = new Map();

    patientAppointments?.forEach(apt => {
      const patient = apt.users;
      if (patient && !patientMap.has(patient.id)) {
        const age = patient.date_of_birth ?
          new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : null;

        patientMap.set(patient.id, {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          age,
          gender: patient.gender,
          created_at: patient.created_at,
          lastAppointment: apt.appointment_date,
          totalAppointments: 1
        });
      } else if (patient && patientMap.has(patient.id)) {
        const existing = patientMap.get(patient.id);
        existing.totalAppointments += 1;
        // Keep the most recent appointment date
        if (apt.appointment_date > existing.lastAppointment) {
          existing.lastAppointment = apt.appointment_date;
        }
      }
    });

    const patients = Array.from(patientMap.values()).slice(0, limit);

    res.json({
      success: true,
      patients,
      count: patients.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor analytics - /api/doctor-dashboard/analytics
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    // Get all appointments for this doctor
    const { data: allAppointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        status,
        appointment_type,
        consultation_fee,
        patient_id,
        users!fk_appointments_patient (
          gender,
          date_of_birth
        )
      `)
      .eq('doctor_id', req.user.id);

    if (appointmentsError) {

      // Fallback with basic appointments data
      const { data: basicAppointments } = await supabase
        .from('appointments')
        .select('id, appointment_date, status, appointment_type, consultation_fee, patient_id')
        .eq('doctor_id', req.user.id);

      return res.json(calculateAnalytics(basicAppointments || [], []));
    }

    // Get patient demographics separately if join failed
    const patientIds = [...new Set(allAppointments.map(apt => apt.patient_id))];
    const { data: patients } = await supabase
      .from('users')
      .select('id, gender, date_of_birth')
      .in('id', patientIds)
      .eq('role', 'patient');

    res.json(calculateAnalytics(allAppointments, patients || []));

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to calculate analytics
function calculateAnalytics(appointments, patients) {
  // Get unique patients count
  const uniquePatients = new Set();
  appointments.forEach(apt => {
    uniquePatients.add(apt.patient_id);
  });

  // Calculate this month's appointments
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const thisMonthAppointments = appointments.filter(apt =>
    new Date(apt.appointment_date) >= thisMonth
  );

  // Calculate completion rate
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');
  const completionRate = appointments.length > 0 ?
    Math.round((completedAppointments.length / appointments.length) * 100) : 0;

  // Calculate total revenue
  const totalRevenue = completedAppointments.reduce((sum, apt) => sum + (apt.consultation_fee || 0), 0);

  // Demographics
  const ageGroups = { '0-18': 0, '19-35': 0, '36-50': 0, '51-65': 0, '65+': 0 };
  const genderDistribution = { male: 0, female: 0, other: 0 };
  const appointmentTypes = { clinic: 0, home: 0 };

  // Process demographics
  appointments.forEach(apt => {
    // Age grouping
    const patient = patients.find(p => p.id === apt.patient_id) || apt.users;
    if (patient?.date_of_birth) {
      const age = new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear();
      if (age <= 18) ageGroups['0-18']++;
      else if (age <= 35) ageGroups['19-35']++;
      else if (age <= 50) ageGroups['36-50']++;
      else if (age <= 65) ageGroups['51-65']++;
      else ageGroups['65+']++;
    }

    // Gender distribution
    if (patient?.gender) {
      const gender = patient.gender.toLowerCase();
      genderDistribution[gender] = (genderDistribution[gender] || 0) + 1;
    }

    // Appointment types
    if (apt.appointment_type) {
      appointmentTypes[apt.appointment_type] =
        (appointmentTypes[apt.appointment_type] || 0) + 1;
    }
  });

  return {
    success: true,
    analytics: {
      totalPatients: uniquePatients.size,
      thisMonthAppointments: thisMonthAppointments.length,
      completionRate,
      avgRating: 4.5, // TODO: Calculate from reviews
      totalRevenue,
      patientDemographics: {
        ageGroups,
        genderDistribution,
        appointmentTypes
      }
    }
  };
}

// Get doctor appointments - /api/doctor-dashboard/appointments
router.get('/appointments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    // Mark past appointments as absent before fetching
    await markPastAppointmentsAsAbsent(req.user.id, null);

    const limit = parseInt(req.query.limit) || 50;
    const status = req.query.status;

    let query = supabase
      .from('appointments')
      .select(`
        id,
        appointment_date,
        appointment_time,
        status,
        type,
        appointment_type,
        consultation_fee,
        symptoms,
        chief_complaint,
        notes,
        patient_id,
        center_id,
        users!fk_appointments_patient (name, name_ar, first_name, first_name_ar, last_name, last_name_ar, phone, email),
        center:centers!fk_appointments_center (id, name, name_ar, address, phone)
      `)
      .eq('doctor_id', req.user.id)
      .order('appointment_date', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: appointments, error } = await query;

    if (error) {

      // Fallback without joins
      let fallbackQuery = supabase
        .from('appointments')
        .select('*')
        .eq('doctor_id', req.user.id)
        .order('appointment_date', { ascending: false })
        .limit(limit);

      if (status) {
        fallbackQuery = fallbackQuery.eq('status', status);
      }

      const { data: fallbackAppointments } = await fallbackQuery;

      // Enrich with patient names and center info
      const enrichedAppointments = [];
      for (const apt of fallbackAppointments || []) {
        const { data: patient } = await supabase
          .from('users')
          .select('name, phone, email')
          .eq('id', apt.patient_id)
          .eq('role', 'patient')
          .single();

        let center = null;
        if (apt.center_id) {
          const { data: centerData } = await supabase
            .from('centers')
            .select('id, name, name_ar, address, phone')
            .eq('id', apt.center_id)
            .single();
          center = centerData;
        }

        enrichedAppointments.push({
          ...apt,
          patient_name: patient?.name || 'Unknown Patient',
          patient_phone: patient?.phone,
          patient_email: patient?.email,
          center: center,
          center_name: center?.name,
          center_name_ar: center?.name_ar,
          center_address: center?.address
        });
      }

      return res.json({
        success: true,
        appointments: enrichedAppointments,
        count: enrichedAppointments.length
      });
    }

    // Format successful response
    const formattedAppointments = appointments?.map(apt => {
      const user = Array.isArray(apt.users) ? apt.users[0] : apt.users;
      const center = Array.isArray(apt.center) ? apt.center[0] : apt.center;
      return {
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        type: apt.type,
        appointment_type: apt.appointment_type,
        consultation_fee: apt.consultation_fee,
        symptoms: apt.symptoms,
        chief_complaint: apt.chief_complaint,
        notes: apt.notes,
        patient_id: apt.patient_id,
        center_id: apt.center_id,
        patient_name: user?.name || 'Unknown Patient',
        name: user?.name,
        name_ar: user?.name_ar,
        first_name: user?.first_name,
        first_name_ar: user?.first_name_ar,
        last_name: user?.last_name,
        last_name_ar: user?.last_name_ar,
        patient_phone: user?.phone,
        patient_email: user?.email,
        center: center,
        center_name: center?.name,
        center_name_ar: center?.name_ar,
        center_address: center?.address
      };
    }) || [];

    res.json({
      success: true,
      appointments: formattedAppointments,
      count: formattedAppointments.length
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update appointment status - /api/doctor-dashboard/appointments/:id/status
router.put('/appointments/:id/status', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    // Validate status
    const validStatuses = ['scheduled', 'confirmed', 'cancelled', 'completed', 'no_show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Verify appointment belongs to this doctor
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, doctor_id')
      .eq('id', id)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (appointment.doctor_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Update appointment
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update appointment' });
    }

    res.json({
      success: true,
      message: 'Appointment status updated successfully',
      appointment: updatedAppointment
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get detailed patient information - /api/doctor-dashboard/patients/:id
router.get('/patients/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { id: patientId } = req.params;

    // Get patient details
    const { data: patient, error: patientError } = await supabase
      .from('users')
      .select('*')
      .eq('id', patientId)
      .eq('role', 'patient')
      .single();

    if (patientError || !patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Calculate age from date_of_birth
    let age = null;
    if (patient.date_of_birth) {
      const today = new Date();
      const birthDate = new Date(patient.date_of_birth);
      age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Remove sensitive data
    const { password_hash, ...patientData } = patient;

    res.json({
      success: true,
      patient: {
        ...patientData,
        age
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient's medical records - /api/doctor-dashboard/patients/:id/medical-records
router.get('/patients/:id/medical-records', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { id: patientId } = req.params;

    // Get medical records for this patient from this doctor
    const { data: records, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch medical records' });
    }

    res.json({
      success: true,
      records: records || []
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get patient's appointment history with this doctor - /api/doctor-dashboard/patients/:id/appointments
router.get('/patients/:id/appointments', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { id: patientId } = req.params;

    // Get appointment history for this patient with this doctor
    const { data: appointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', req.user.id)
      .order('appointment_date', { ascending: false })
      .order('appointment_time', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch patient appointments' });
    }

    res.json({
      success: true,
      appointments: appointments || []
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create medical record - /api/doctor-dashboard/medical-records
router.post('/medical-records', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const {
      patient_id,
      appointment_id,
      diagnosis,
      treatment,
      prescription,
      notes
    } = req.body;

    // Validate required fields
    if (!patient_id || !diagnosis || !treatment) {
      return res.status(400).json({ error: 'Patient ID, diagnosis, and treatment are required' });
    }

    // Create medical record
    const { data: record, error } = await supabase
      .from('medical_records')
      .insert({
        patient_id,
        doctor_id: req.user.id,
        appointment_id,
        diagnosis,
        treatment,
        prescription: prescription || null,
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create medical record' });
    }

    res.json({
      success: true,
      message: 'Medical record created successfully',
      record
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cancel appointment - /api/doctor-dashboard/appointments/:id/cancel
router.put('/appointments/:id/cancel', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { id: appointmentId } = req.params;
    const { cancellation_reason } = req.body;

    // First, fetch the appointment to check timing
    const { data: existingAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, appointment_date, appointment_time, doctor_id')
      .eq('id', appointmentId)
      .eq('doctor_id', req.user.id)
      .single();

    if (fetchError || !existingAppointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Check if appointment is already cancelled
    if (existingAppointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Appointment is already cancelled' });
    }

    // Check if cancellation is within 24 hours of appointment time
    if (existingAppointment.appointment_date && existingAppointment.appointment_time) {
      const appointmentDateTime = new Date(`${existingAppointment.appointment_date}T${existingAppointment.appointment_time}`);
      const now = new Date();
      const hoursUntilAppointment = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Check if appointment is in the past
      if (hoursUntilAppointment < 0) {
        return res.status(400).json({
          error: 'Cannot cancel a past appointment',
          code: 'APPOINTMENT_IN_PAST'
        });
      }

      // Block cancellation if less than 24 hours away
      if (hoursUntilAppointment < 24) {
        return res.status(400).json({
          error: 'Cannot cancel appointment within 24 hours of the scheduled time. Please contact support for assistance.',
          code: 'CANCELLATION_TOO_LATE'
        });
      }
    }

    // Update appointment status to cancelled
    const { data: appointment, error } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancellation_reason: cancellation_reason || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .eq('doctor_id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to cancel appointment' });
    }

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// =============================================================================
// DOCTOR SCHEDULE MANAGEMENT ENDPOINTS
// =============================================================================

// Get doctor's assigned centers - /api/doctor-dashboard/centers
router.get('/centers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    // Get all available centers (only approved ones)
    const { data: allCenters, error: centersError } = await supabase
      .from('centers')
      .select('id, name, name_ar, address, phone, email, approval_status')
      .eq('approval_status', 'approved')
      .order('name');

    if (centersError) throw centersError;

    // Get doctor's current center assignments
    const { data: assignments, error: assignmentsError } = await supabase
      .from('doctor_centers')
      .select('center_id, is_primary')
      .eq('doctor_id', req.user.id);

    if (assignmentsError) throw assignmentsError;

    // Mark assigned centers
    const centersWithAssignment = allCenters.map(center => {
      const assignment = assignments.find(a => a.center_id === center.id);
      return {
        ...center,
        is_assigned: !!assignment,
        is_primary: assignment?.is_primary || false
      };
    });

    res.json({
      success: true,
      centers: centersWithAssignment,
      assigned_centers: centersWithAssignment.filter(c => c.is_assigned)
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor's center assignments - /api/doctor-dashboard/centers
router.put('/centers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { center_ids, primary_center_id } = req.body;


    // Validate input
    if (!Array.isArray(center_ids) || center_ids.length === 0) {
      return res.status(400).json({ error: 'At least one center must be selected' });
    }

    if (primary_center_id && !center_ids.includes(primary_center_id)) {
      return res.status(400).json({ error: 'Primary center must be one of the assigned centers' });
    }

    // Remove existing assignments
    const { error: deleteError } = await supabase
      .from('doctor_centers')
      .delete()
      .eq('doctor_id', req.user.id);

    if (deleteError) throw deleteError;

    // Add new assignments
    const assignments = center_ids.map(center_id => ({
      doctor_id: req.user.id,
      center_id: center_id,
      is_primary: center_id === primary_center_id,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('doctor_centers')
      .insert(assignments);

    if (insertError) throw insertError;


    res.json({
      success: true,
      message: 'Center assignments updated successfully',
      assigned_centers: center_ids,
      primary_center: primary_center_id
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor's weekly schedule - /api/doctor-dashboard/schedule
router.get('/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { center_id } = req.query;


    let query = supabase
      .from('doctor_schedules')
      .select(`
        *,
        centers:center_id(id, name, address)
      `)
      .eq('doctor_id', req.user.id);

    // Filter by center if specified
    if (center_id) {
      query = query.eq('center_id', center_id);
    }

    const { data: schedule, error } = await query.order('center_id').order('day_of_week');

    if (error) throw error;

    // Get doctor's home visit availability
    const { data: doctor, error: doctorError } = await supabase
      .from('users')
      .select('home_visits_available, consultation_fee')
      .eq('id', req.user.id)
      .single();

    if (doctorError) throw doctorError;

    // Group schedule by center if no specific center requested
    let groupedSchedule = {};
    if (!center_id) {
      schedule.forEach(item => {
        const centerId = item.center_id || 'general';
        const centerName = item.centers?.name || 'General Schedule';

        if (!groupedSchedule[centerId]) {
          groupedSchedule[centerId] = {
            center_id: centerId,
            center_name: centerName,
            center_info: item.centers,
            schedule: []
          };
        }
        groupedSchedule[centerId].schedule.push(item);
      });
    }

    res.json({
      success: true,
      schedule: center_id ? schedule : Object.values(groupedSchedule),
      home_visits_available: doctor.home_visits_available,
      default_consultation_fee: doctor.consultation_fee,
      center_specific: !center_id
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update doctor's weekly schedule - /api/doctor-dashboard/schedule
router.put('/schedule', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { schedule, center_id } = req.body;

    // Validate that center_id is provided
    if (!center_id) {
      return res.status(400).json({ error: 'Center ID is required' });
    }

    // Validate that the doctor is assigned to this center
    const { data: assignment, error: assignmentError } = await supabase
      .from('doctor_centers')
      .select('center_id')
      .eq('doctor_id', req.user.id)
      .eq('center_id', center_id)
      .single();

    if (assignmentError || !assignment) {
      return res.status(403).json({ error: 'You are not assigned to this medical center. Please go to Centers tab to select your assigned centers first.' });
    }


    // Validate schedule format
    if (!Array.isArray(schedule)) {
      return res.status(400).json({ error: 'Schedule must be an array' });
    }

    if (schedule.length === 0) {
    }

    // Use the database function to set up the schedule
    const { error: funcError } = await supabase
      .rpc('setup_doctor_weekly_schedule', {
        p_doctor_id: req.user.id,
        p_schedule: schedule,
        p_center_id: center_id
      });

    if (funcError) {
      throw funcError;
    }


    // Get the updated schedule for this specific center
    const { data: updatedSchedule, error: fetchError } = await supabase
      .from('doctor_schedules')
      .select(`
        *,
        centers:center_id(id, name, address)
      `)
      .eq('doctor_id', req.user.id)
      .eq('center_id', center_id)
      .order('day_of_week');

    if (fetchError) {
      throw fetchError;
    }


    res.json({
      success: true,
      message: 'Schedule updated successfully',
      schedule: updatedSchedule,
      center_id: center_id
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Toggle home visits availability - /api/doctor-dashboard/home-visits
router.put('/home-visits', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { home_visits_available } = req.body;

    if (typeof home_visits_available !== 'boolean') {
      return res.status(400).json({ error: 'home_visits_available must be a boolean' });
    }

    // Start a transaction to handle both user update and center creation/deletion
    if (home_visits_available) {
      // Enable home visits - create home visit center

      // First update the user
      const { data: doctor, error: userError } = await supabase
        .from('users')
        .update({
          home_visits_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.id)
        .eq('role', 'doctor')
        .select('name')
        .single();

      if (userError) throw userError;

      // Check if home visit center already exists
      const { data: existingCenter, error: centerCheckError } = await supabase
        .from('centers')
        .select('id')
        .eq('name', `${doctor.name} - Home Visit Schedule`)
        .eq('owner_doctor_id', req.user.id)
        .eq('center_type', 'personal')
        .single();

      if (centerCheckError && centerCheckError.code !== 'PGRST116') {
        throw centerCheckError;
      }

      if (!existingCenter) {
        // Create new home visit center
        const { data: newCenter, error: centerError } = await supabase
          .from('centers')
          .insert({
            name: `${doctor.name} - Home Visit Schedule`,
            address: 'Home Visit Service',
            phone: null,
            email: null,
            center_type: 'personal',
            owner_doctor_id: req.user.id,
            approval_status: 'approved',
            offers_labs: false,
            offers_imaging: false,
            operating_hours: {
              monday: { start: '09:00', end: '17:00', available: true },
              tuesday: { start: '09:00', end: '17:00', available: true },
              wednesday: { start: '09:00', end: '17:00', available: true },
              thursday: { start: '09:00', end: '17:00', available: true },
              friday: { start: '09:00', end: '17:00', available: true },
              saturday: { start: '09:00', end: '17:00', available: true },
              sunday: { start: '09:00', end: '17:00', available: false }
            },
            services: ['Home Visit Consultations']
          })
          .select()
          .single();

        if (centerError) throw centerError;

        // Create doctor-center relationship
        const { error: dcError } = await supabase
          .from('doctor_centers')
          .insert({
            doctor_id: req.user.id,
            center_id: newCenter.id,
            is_primary: false
          });

        if (dcError) throw dcError;

      }

    } else {
      // Disable home visits - remove home visit center

      // First update the user
      const { data: doctor, error: userError } = await supabase
        .from('users')
        .update({
          home_visits_available,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.id)
        .eq('role', 'doctor')
        .select('name')
        .single();

      if (userError) throw userError;

      // Find and delete home visit center
      const { data: homeCenter, error: findError } = await supabase
        .from('centers')
        .select('id')
        .eq('name', `${doctor.name} - Home Visit Schedule`)
        .eq('owner_doctor_id', req.user.id)
        .eq('center_type', 'personal')
        .single();

      if (findError && findError.code !== 'PGRST116') {
        throw findError;
      }

      if (homeCenter) {
        // Delete doctor-center relationship first
        const { error: dcDeleteError } = await supabase
          .from('doctor_centers')
          .delete()
          .eq('doctor_id', req.user.id)
          .eq('center_id', homeCenter.id);

        if (dcDeleteError) throw dcDeleteError;

        // Delete any scheduled appointments for this center (optional, depending on business logic)
        // You might want to handle this differently based on your requirements

        // Delete doctor schedules for this center
        const { error: scheduleDeleteError } = await supabase
          .from('doctor_schedules')
          .delete()
          .eq('doctor_id', req.user.id)
          .eq('center_id', homeCenter.id);

        if (scheduleDeleteError) throw scheduleDeleteError;

        // Finally delete the center
        const { error: centerDeleteError } = await supabase
          .from('centers')
          .delete()
          .eq('id', homeCenter.id);

        if (centerDeleteError) throw centerDeleteError;

      }
    }

    res.json({
      success: true,
      message: `Home visits ${home_visits_available ? 'enabled' : 'disabled'} successfully`,
      home_visits_available
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get available slots for a specific date - /api/doctor-dashboard/available-slots/:date
router.get('/available-slots/:date', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { date } = req.params;
    const { appointment_type = 'clinic' } = req.query;

    // Validate date format
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Use the database function to get available slots
    const { data: slots, error } = await supabase
      .rpc('get_available_slots_for_booking', {
        p_doctor_id: req.user.id,
        p_date: date,
        p_appointment_type: appointment_type
      });

    if (error) throw error;

    res.json({
      success: true,
      date,
      appointment_type,
      slots: slots || []
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get doctor availability for date range (for calendar view) - /api/doctor-dashboard/availability
router.get('/availability', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    // Get doctor's schedule for the date range
    const { data: schedule, error: scheduleError } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', req.user.id)
      .eq('is_available', true);

    if (scheduleError) throw scheduleError;

    // Get appointments in the date range
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select('appointment_date, appointment_time, status')
      .eq('doctor_id', req.user.id)
      .gte('appointment_date', start_date)
      .lte('appointment_date', end_date)
      .not('status', 'in', '(cancelled,no_show)');

    if (appointmentsError) throw appointmentsError;

    // Process the data to show availability for each day
    const availability = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayOfWeek = date.getDay();
      const dateStr = date.toISOString().split('T')[0];

      const daySchedule = schedule.find(s => s.day_of_week === dayOfWeek);
      const dayAppointments = appointments.filter(a => a.appointment_date === dateStr);

      availability.push({
        date: dateStr,
        day_of_week: dayOfWeek,
        is_available: !!daySchedule,
        total_slots: daySchedule ? (daySchedule.time_slots ? daySchedule.time_slots.length : 0) : 0,
        booked_slots: dayAppointments.length,
        available_slots: daySchedule ? Math.max(0, (daySchedule.time_slots ? daySchedule.time_slots.length : 0) - dayAppointments.length) : 0
      });
    }

    res.json({
      success: true,
      start_date,
      end_date,
      availability
    });

  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new medical center (for admin approval)
router.post('/centers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }

    const { name, address, phone, email, center_type, operating_hours, services } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address are required' });
    }

    // Validate center_type
    if (!['generic', 'personal'].includes(center_type)) {
      return res.status(400).json({ error: 'Center type must be either "generic" or "personal"' });
    }


    // Create center with pending approval status
    const { data: newCenter, error } = await supabase
      .from('centers')
      .insert({
        name,
        address,
        phone,
        email,
        center_type,
        approval_status: 'pending', // This is key - it should appear in admin approvals
        owner_doctor_id: req.user.id,
        operating_hours: operating_hours || {},
        services: services || [],
        offers_labs: center_type === 'generic', // Generic centers typically offer labs
        offers_imaging: center_type === 'generic', // Generic centers typically offer imaging
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({
        error: 'Failed to create center request',
        details: error.message
      });
    }


    res.status(201).json({
      success: true,
      data: newCenter,
      approval_status: 'pending',
      message: 'Center request submitted for admin approval'
    });

  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

export default router;
