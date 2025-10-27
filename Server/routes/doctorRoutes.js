import express from "express";
import * as doctorController from "../controllers/doctorController.js";
import { verifyToken, requireDoctorSelf, isDoctorOrAdmin, canAccessDoctorData, optionalAuth } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();

// Setup multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Public routes (no auth required)
router.get("/all", optionalAuth, doctorController.getAllDoctors);
router.get("/:doctorId/availability", doctorController.getDoctorAvailability); // Public access for patients
router.get("/:doctorId/availability/:date", doctorController.getDoctorAvailability); // Public access for patients with date
router.get("/:doctorId/working-days", doctorController.getDoctorWorkingDays); // Public access for patients to see working days

// Protected routes
router.use(verifyToken);

// Doctor-only routes - these routes use authenticated user's data (no doctorId parameter)
router.get("/profile", requireDoctorSelf, doctorController.getDoctorProfile);
router.put("/profile", requireDoctorSelf, doctorController.updateDoctorProfile);
router.post("/schedule", requireDoctorSelf, doctorController.setSchedule);
router.post("/vacation", requireDoctorSelf, doctorController.setVacationDays);
router.get("/patients", requireDoctorSelf, doctorController.getPatientsList);
router.get("/analytics", requireDoctorSelf, doctorController.getDoctorAnalytics);
router.get("/patient-demographics", requireDoctorSelf, doctorController.getPatientDemographics);
router.get("/appointment-stats", requireDoctorSelf, doctorController.getAppointmentStats);
router.get("/financial-analytics", requireDoctorSelf, doctorController.getFinancialAnalytics);
router.get("/schedule", requireDoctorSelf, doctorController.getSchedule);
router.put("/schedule", requireDoctorSelf, doctorController.updateSchedule);
router.get("/availability", requireDoctorSelf, doctorController.getDoctorAvailability);
router.post("/profile-picture", upload.single("profilePicture"), requireDoctorSelf, doctorController.uploadProfilePicture);

// Admin routes - these routes allow access to specific doctors (with authorization checks)
router.get("/:doctorId/profile", canAccessDoctorData, doctorController.getDoctorProfile);
router.put("/:doctorId/profile", canAccessDoctorData, doctorController.updateDoctorProfile);
router.post("/:doctorId/schedule", canAccessDoctorData, doctorController.setSchedule);
router.post("/:doctorId/vacation", canAccessDoctorData, doctorController.setVacationDays);
router.get("/:doctorId/patients", canAccessDoctorData, doctorController.getPatientsList);
router.get("/:doctorId/analytics", canAccessDoctorData, doctorController.getDoctorAnalytics);
router.get("/:doctorId/patient-demographics", canAccessDoctorData, doctorController.getPatientDemographics);
router.get("/:doctorId/appointment-stats", canAccessDoctorData, doctorController.getAppointmentStats);
router.get("/:doctorId/financial-analytics", canAccessDoctorData, doctorController.getFinancialAnalytics);
router.get("/:doctorId/schedule", canAccessDoctorData, doctorController.getSchedule);
router.put("/:doctorId/schedule", canAccessDoctorData, doctorController.updateSchedule);
router.post("/:doctorId/profile-picture", upload.single("profilePicture"), canAccessDoctorData, doctorController.uploadProfilePicture);

// Patient management routes (for doctors to access their patients)
router.get("/patients/:patientId", requireDoctorSelf, doctorController.getPatientDetails);
router.post("/patients/:patientId/medical-records", requireDoctorSelf, doctorController.createMedicalRecord);

export default router;