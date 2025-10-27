// SIMPLIFIED AUTH MIDDLEWARE - No Supabase Auth dependencies
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from "../utils/supabase.js";

// Simple JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'your-simple-jwt-secret-key';

export const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: "No token provided",
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // For now, let's bypass token verification and use a simple approach
    // In a real app, you'd verify the JWT properly
    
    // Extract user info from token or use default for testing
    let userId, email, role;
    
    try {
      // Try to decode JWT if it's a real token
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.userId;
      email = decoded.email;
      role = decoded.role;
    } catch (jwtError) {
      // If not a valid JWT, assume it's a simple user identifier for testing
      // This is a temporary approach for development
      if (token === 'simple-patient-1') {
        userId = 'simple-user-1';
        email = 'qora@gmail.com';
        role = 'patient';
      } else if (token === 'simple-patient-2') {
        userId = 'simple-user-2';
        email = 'sora@gmail.com';
        role = 'patient';
      } else {
        return res.status(401).json({
          success: false,
          message: "Invalid token format",
        });
      }
    }

    console.log('=== SIMPLIFIED AUTH DEBUG ===');
    console.log('Token received:', token);
    console.log('Extracted userId:', userId);
    console.log('Extracted email:', email);
    console.log('Extracted role:', role);

    // Look up user in database
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('Database user lookup error:', userError);
      return res.status(500).json({
        success: false,
        message: "Database error during authentication"
      });
    }

    let patientId = null;
    if (role === 'patient') {
      // Look up patient record
      const { data: patient, error: patientError } = await supabaseAdmin
        .from('patients')
        .select('id, uid, name, email')
        .eq('email', email)
        .single();

      if (!patientError && patient) {
        patientId = patient.id;
        console.log('Patient found:', patient);
      } else {
        console.log('Patient lookup error or not found:', patientError);
      }
    }

    // Set user info for the request
    req.user = {
      uid: userId,
      id: patientId || userId, // Use patient ID if available, otherwise user ID
      email: email,
      role: role,
      name: user?.first_name ? `${user.first_name} ${user.last_name}` : email.split('@')[0],
      user_metadata: {
        name: user?.first_name ? `${user.first_name} ${user.last_name}` : email.split('@')[0]
      }
    };

    console.log('Final user object:', req.user);
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: "Authentication failed"
    });
  }
};

export const isDoctor = (req, res, next) => {
  if (req.user && req.user.role === 'doctor') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Doctor role required."
    });
  }
};

export const isPatient = (req, res, next) => {
  if (req.user && req.user.role === 'patient') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Patient role required."
    });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin role required."
    });
  }
};

// Helper function to generate simple tokens for testing
export const generateSimpleToken = (userId, email, role) => {
  return jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// For development/testing - simple login without Supabase Auth
export const simpleLogin = async (email, password) => {
  // Look up user in database
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    throw new Error('User not found');
  }

  // In a real app, you'd verify the password hash
  // For now, just return a token
  const token = generateSimpleToken(user.id, user.email, user.role);
  
  return {
    user,
    token,
    success: true
  };
};
