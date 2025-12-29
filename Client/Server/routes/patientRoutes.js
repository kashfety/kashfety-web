import express from "express";
import * as patientController from "../controllers/patientController.js";
import { authenticateToken, requirePatientSelf, isDoctorOrAdmin, canAccessPatientData } from "../middleware/auth.js";

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Patient-only routes - these routes use authenticated user's data (no patientId parameter)
router.get("/profile", requirePatientSelf, patientController.getPatientProfile);
router.put("/profile", requirePatientSelf, patientController.updatePatientProfile);
router.get("/medical-records", requirePatientSelf, patientController.getPatientMedicalRecords);
router.get("/appointments", requirePatientSelf, patientController.getPatientAppointmentHistory);
router.get("/dashboard", requirePatientSelf, patientController.getPatientDashboard);
router.put("/emergency-contact", requirePatientSelf, patientController.updateEmergencyContact);

// Doctor/Admin routes - these routes allow access to specific patients (with authorization checks)
router.get("/:patientId/profile", canAccessPatientData, patientController.getPatientProfile);
router.get("/:patientId/medical-records", canAccessPatientData, patientController.getPatientMedicalRecords);
router.post("/:patientId/medical-records", isDoctorOrAdmin, patientController.createMedicalRecord);
router.put("/medical-records/:recordId", isDoctorOrAdmin, patientController.updateMedicalRecord);
router.get("/:patientId/appointments", canAccessPatientData, patientController.getPatientAppointmentHistory);
router.get("/:patientId/dashboard", canAccessPatientData, patientController.getPatientDashboard);

// Search patients (for doctors and admins only)
router.get("/search", isDoctorOrAdmin, patientController.searchPatients);

export default router; 