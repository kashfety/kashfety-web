// Authentication middleware with password encryption and JWT tokens
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';
const SALT_ROUNDS = 10;

// Hash password
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
  } catch (error) {
    throw new Error('Error hashing password');
  }
};

// Compare password
export const comparePassword = async (password, hashedPassword) => {
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Error comparing password');
  }
};

// Generate JWT token
export const generateToken = (user) => {
  const payload = {
    id: user.id,
    uid: user.uid,
    phone: user.phone,
    email: user.email,
    name: user.name,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    center_id: user.center_id || null
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'doctor-appointment-system'
  });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

// Middleware to authenticate JWT token
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to authenticate specific roles
export const authenticateRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Optional authentication middleware (for endpoints that work with or without auth)
export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token) {
    try {
      const user = verifyToken(token);
      req.user = user;
    } catch (error) {
      // Token is invalid, but we continue without authentication
      req.user = null;
    }
  } else {
    req.user = null;
  }

  next();
};

// Helper functions for role checks (compatible with authMiddleware.js)
export const isDoctor = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Access denied. Doctors only.' });
  }
  next();
};

export const isPatient = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Access denied. Patients only.' });
  }
  next();
};

export const isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    return res.status(403).json({ error: 'Access denied. Admins only.' });
  }
  next();
};

export const isDoctorOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (!['doctor', 'admin', 'super_admin'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Access denied. Doctors or Admins only.' });
  }
  next();
};

// Check if user can access patient data (patient accessing own data or doctor/admin accessing any)
export const canAccessPatientData = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestedPatientId = req.params.patientId || req.params.uid;

  // If user is admin or super_admin, allow access to any patient data
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }

  // If user is a patient, only allow access to their own data
  if (req.user.role === 'patient') {
    if (requestedPatientId && requestedPatientId !== req.user.id && requestedPatientId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
    }
    return next();
  }

  // If user is a doctor, allow access (they should only see their own patients, enforced in controller)
  if (req.user.role === 'doctor') {
    return next();
  }

  return res.status(403).json({ error: 'Access denied.' });
};

// Check if user can access doctor data (doctor accessing own data or admin accessing any)
export const canAccessDoctorData = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestedDoctorId = req.params.doctorId || req.params.uid;

  // If user is admin or super_admin, allow access to any doctor data
  if (req.user.role === 'admin' || req.user.role === 'super_admin') {
    return next();
  }

  // If user is a doctor, only allow access to their own data
  if (req.user.role === 'doctor') {
    if (requestedDoctorId && requestedDoctorId !== req.user.id && requestedDoctorId !== req.user.uid) {
      return res.status(403).json({ error: 'Access denied. You can only access your own data.' });
    }
    return next();
  }

  return res.status(403).json({ error: 'Access denied. Doctors or Admins only.' });
};

// Middleware for patient-only routes that use authenticated user's data
export const requirePatientSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'Access denied. Patients only.' });
  }

  // Set the patientId to the authenticated user's ID to prevent parameter manipulation
  req.authenticatedPatientUid = req.user.id || req.user.uid;
  next();
};

// Middleware for doctor-only routes that use authenticated user's data  
export const requireDoctorSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'Access denied. Doctors only.' });
  }

  // Set the doctorId to the authenticated user's ID to prevent parameter manipulation
  req.authenticatedDoctorUid = req.user.id || req.user.uid;
  next();
};