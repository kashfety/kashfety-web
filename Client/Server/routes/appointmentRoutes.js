import express from "express";
import * as appointmentController from "../controllers/appointmentController.js";
import { authenticateToken, isDoctor, isPatient, isDoctorOrAdmin } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Patient appointment routes
router.get("/patient/:patientId", isPatient, appointmentController.getPatientAppointments);
router.post("/book", isPatient, appointmentController.bookAppointment);
router.post("/book-home-visit", isPatient, appointmentController.bookHomeVisit);
router.put("/:appointmentId/cancel", isPatient, appointmentController.cancelAppointment);

// Doctor appointment routes  
router.get("/doctor/:doctorId", isDoctor, appointmentController.getDoctorAppointments);
router.put("/:appointmentId/confirm", isDoctor, appointmentController.confirmAppointment);
router.put("/:appointmentId/complete", isDoctor, appointmentController.completeAppointment);
router.put("/:appointmentId/reschedule", appointmentController.rescheduleAppointment);

// Medical test booking routes
router.post("/medical-tests/book", isPatient, appointmentController.bookMedicalTest);
router.get("/medical-tests/patient/:patientId", isPatient, appointmentController.getPatientMedicalTests);

// General appointment routes
router.get("/:appointmentId", appointmentController.getAppointmentDetails);
router.get("/available-slots/:doctorId", appointmentController.getAvailableSlots);

// Admin routes
router.get("/all", isDoctorOrAdmin, appointmentController.getAllAppointments);

export default router; 