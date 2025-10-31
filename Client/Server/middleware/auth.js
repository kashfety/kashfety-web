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
  console.log('🔑 AUTH MIDDLEWARE - Path:', req.path, 'Method:', req.method);
  const authHeader = req.headers['authorization'];
  console.log('🔑 AUTH MIDDLEWARE - Auth header:', authHeader ? authHeader.substring(0, 20) + '...' : 'NONE');
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  console.log('🔑 AUTH MIDDLEWARE - Token extracted:', token ? token.substring(0, 20) + '...' : 'NONE');

  if (!token) {
    console.log('❌ AUTH MIDDLEWARE - No token provided');
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    console.log('✅ AUTH MIDDLEWARE - Token valid, user:', user.email, 'role:', user.role);
    next();
  } catch (error) {
    console.log('❌ AUTH MIDDLEWARE - Token verification failed:', error.message);
    console.log('❌ AUTH MIDDLEWARE - Error details:', error);
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
