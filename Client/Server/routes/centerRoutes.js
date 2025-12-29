import express from "express";
import * as centerController from "../controllers/centerController.js";
import { authenticateToken, isAdmin, isDoctorOrAdmin } from "../middleware/auth.js";

const router = express.Router();

// Public routes (no auth required)
router.get("/all", centerController.getAllCenters);
router.get("/by-type/:type", centerController.getCentersByType);
router.get("/services/:centerId", centerController.getCenterServices);
router.get("/nearby", centerController.getNearbyCenters);

// Protected routes
router.use(authenticateToken);

// Admin routes for center management
router.post("/", isAdmin, centerController.createCenter);
router.put("/:centerId", isAdmin, centerController.updateCenter);
router.delete("/:centerId", isAdmin, centerController.deleteCenter);

// Doctor-center relationship routes
router.post("/assign-doctor", isDoctorOrAdmin, centerController.assignDoctorToCenter);
router.delete("/unassign-doctor", isDoctorOrAdmin, centerController.unassignDoctorFromCenter);
router.get("/doctor/:doctorId", centerController.getDoctorCenters);

// Service availability routes
router.get("/:centerId/available-slots", centerController.getAvailableSlots);
router.post("/:centerId/services", isAdmin, centerController.addCenterService);
router.delete("/:centerId/services/:service", isAdmin, centerController.removeCenterService);

export default router; 