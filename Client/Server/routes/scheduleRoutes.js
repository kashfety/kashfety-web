import express from 'express';
import { verifyToken, isDoctorOrAdmin } from '../middleware/authMiddleware.js';
import {
  getDoctorSchedule,
  updateWorkHours,
  addVacation,
  checkAvailability,
  getAvailableSlots
} from '../controllers/scheduleController.js';

const router = express.Router();

// Public endpoint: Get doctor schedule (work hours, vacations, overrides) - NO AUTH REQUIRED
router.get('/public/:doctorId', getDoctorSchedule);

// Get doctor schedule (work hours, vacations, overrides) - AUTH REQUIRED  
router.get('/:doctorId', verifyToken, getDoctorSchedule);

// Update doctor work hours
router.put('/:doctorId/work-hours', verifyToken, isDoctorOrAdmin, updateWorkHours);

// Add vacation period
router.post('/:doctorId/vacation', verifyToken, isDoctorOrAdmin, addVacation);

// Check availability for specific date/time
router.get('/:doctorId/availability', verifyToken, checkAvailability);

// Public endpoint: Get available time slots for a date - NO AUTH REQUIRED
router.get('/public/:doctorId/available-slots', getAvailableSlots);

// Get available time slots for a date - AUTH REQUIRED
router.get('/:doctorId/available-slots', verifyToken, getAvailableSlots);

export default router; 