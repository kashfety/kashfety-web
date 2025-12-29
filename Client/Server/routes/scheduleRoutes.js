import express from 'express';
import { authenticateToken, isDoctorOrAdmin } from '../middleware/auth.js';
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
router.get('/:doctorId', authenticateToken, getDoctorSchedule);

// Update doctor work hours
router.put('/:doctorId/work-hours', authenticateToken, isDoctorOrAdmin, updateWorkHours);

// Add vacation period
router.post('/:doctorId/vacation', authenticateToken, isDoctorOrAdmin, addVacation);

// Check availability for specific date/time
router.get('/:doctorId/availability', authenticateToken, checkAvailability);

// Public endpoint: Get available time slots for a date - NO AUTH REQUIRED
router.get('/public/:doctorId/available-slots', getAvailableSlots);

// Get available time slots for a date - AUTH REQUIRED
router.get('/:doctorId/available-slots', authenticateToken, getAvailableSlots);

export default router; 