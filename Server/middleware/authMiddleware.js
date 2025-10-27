import { supabaseAdmin, dbHelpers } from "../utils/supabase.js";

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
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    // For profile endpoints, just verify the token and pass the user info
    // The controller will handle creating the user if they don't exist in database
    if (req.path.includes('/profile/') && req.path.includes('/data')) {
      req.user = {
        uid: user.id,
        email: user.email,
        role: user.user_metadata?.role || 'patient',
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'User'
      };
      return next();
    }
    
    // Get the user from database to get role and other info for other endpoints
    try {
      console.log('=== AUTH MIDDLEWARE DEBUG ===');
      console.log('Looking for user in database:', user.id);
      
      // Try to find user in doctors table first
      let userData = await dbHelpers.getDoctorByUid(user.id);
      let userRole = 'doctor';
      
      console.log('Doctor lookup result:', userData ? 'Found' : 'Not found');
      
      // If not found in doctors, try patients table
      if (!userData) {
        userData = await dbHelpers.getPatientByUid(user.id);
        userRole = 'patient';
        console.log('Patient lookup result:', userData ? 'Found' : 'Not found');
      }
      
      if (!userData) {
        console.log('=== USER NOT FOUND IN DATABASE ===');
        console.log('User ID:', user.id);
        console.log('User email:', user.email);
        console.log('User metadata:', user.user_metadata);
        return res.status(403).json({
          success: false,
          message: "User not found in database",
        });
      }
      
      req.user = {
        uid: user.id,
        email: user.email,
        role: userRole,
        name: userData.name,
        id: userData.id
      };
      
      next();
    } catch (dbError) {
      console.error("Database error in auth middleware:", dbError);
      return res.status(403).json({
        success: false,
        message: "Database error",
      });
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

// Check if user is a doctor
export const isDoctor = (req, res, next) => {
  if (req.user?.role !== "doctor") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Doctors only.",
    });
  }
  
  next();
};

// Check if user is a patient
export const isPatient = (req, res, next) => {
  if (req.user?.role !== "patient") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Patients only.",
    });
  }
  
  next();
};

// Check if user is an admin
export const isAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admins only.",
    });
  }
  
  next();
};

// Check if user is doctor or admin
export const isDoctorOrAdmin = (req, res, next) => {
  if (!['doctor', 'admin'].includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Doctors or Admins only.",
    });
  }
  
  next();
};

// Check if user can access patient data (patient accessing own data or doctor/admin accessing any)
export const canAccessPatientData = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const requestedPatientId = req.params.patientId;
  
  // If user is admin, allow access to any patient data
  if (req.user.role === 'admin') {
    return next();
  }
  
  // If user is a patient, only allow access to their own data
  if (req.user.role === 'patient') {
    if (requestedPatientId && requestedPatientId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own data.",
      });
    }
    return next();
  }
  
  // If user is a doctor, allow access (they should only see their own patients, enforced in controller)
  if (req.user.role === 'doctor') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: "Access denied.",
  });
};

// Check if user can access doctor data (doctor accessing own data or admin accessing any)
export const canAccessDoctorData = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const requestedDoctorId = req.params.doctorId;
  
  // If user is admin, allow access to any doctor data
  if (req.user.role === 'admin') {
    return next();
  }
  
  // If user is a doctor, only allow access to their own data
  if (req.user.role === 'doctor') {
    if (requestedDoctorId && requestedDoctorId !== req.user.uid) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own data.",
      });
    }
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: "Access denied. Doctors or Admins only.",
  });
};

// Middleware for patient-only routes that use authenticated user's data
export const requirePatientSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== 'patient') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Patients only.",
    });
  }

  // Set the patientId to the authenticated user's UID to prevent parameter manipulation
  req.authenticatedPatientUid = req.user.uid;
  next();
};

// Middleware for doctor-only routes that use authenticated user's data  
export const requireDoctorSelf = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  if (req.user.role !== 'doctor') {
    return res.status(403).json({
      success: false,
      message: "Access denied. Doctors only.",
    });
  }

  // Set the doctorId to the authenticated user's UID to prevent parameter manipulation
  req.authenticatedDoctorUid = req.user.uid;
  next();
};

// Optional auth middleware - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    
    if (error || !user) {
      req.user = null;
      return next();
    }
    
    // Get the user from database
    try {
      // Try to find user in doctors table first
      let userData = await dbHelpers.getDoctorByUid(user.id);
      let userRole = 'doctor';
      
      // If not found in doctors, try patients table
      if (!userData) {
        userData = await dbHelpers.getPatientByUid(user.id);
        userRole = 'patient';
      }
      
      if (userData) {
        req.user = {
          uid: user.id,
          email: user.email,
          role: userRole,
          name: userData.name,
          id: userData.id
        };
      } else {
        req.user = null;
      }
    } catch (dbError) {
      console.error("Database error in optional auth:", dbError);
      req.user = null;
    }
    
    next();
  } catch (error) {
    console.error("Optional auth middleware error:", error);
    req.user = null;
    next();
  }
};