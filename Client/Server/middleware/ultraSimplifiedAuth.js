// ULTRA SIMPLIFIED AUTH - No Supabase Auth, No auth.users table
// Works purely with our own users table that contains patients/doctors
import { supabaseAdmin } from "../utils/supabase.js";

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
    
    console.log('=== ULTRA SIMPLIFIED AUTH DEBUG ===');
    console.log('Token received:', token);
    
    // Ultra simple token verification - just use the token as user ID
    // In production, you'd use proper JWT or session management
    let userId = token;
    
    // Handle different token formats for testing
    if (token.startsWith('user-')) {
      userId = token.replace('user-', '');
    } else if (token.startsWith('simple-')) {
      userId = token.replace('simple-', '');
    }
    
    console.log('Extracted userId:', userId);

    // Look up user in our own users table (not auth.users)
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.log('User not found in users table:', userError);
      return res.status(401).json({
        success: false,
        message: "Invalid token - user not found"
      });
    }

    console.log('User found in users table:', user);

    // Set user info for the request based on role
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      
      // For patients: use the user record directly (no separate patients table needed)
      patient_id: user.role === 'patient' ? user.id : null,
      
      // For doctors: use the user record directly (no separate doctors table needed)  
      doctor_id: user.role === 'doctor' ? user.id : null,

      // Include all user fields for flexibility
      ...user
    };

    console.log('Final user object for request:', req.user);
    next();
    
  } catch (error) {
    console.error('Ultra simplified auth error:', error);
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

// Ultra simple login - no password hashing for development
export const ultraSimpleLogin = async (email, password) => {
  try {
    console.log('=== ULTRA SIMPLE LOGIN ===');
    console.log('Email:', email);

    // Find user in our users table by email
    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      throw new Error('User not found');
    }

    console.log('User found:', user);

    // For development, skip password verification
    // In production, verify password hash here
    
    // Return simple token (just the user ID)
    const token = user.id;
    
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        ...user
      },
      token: token
    };
    
  } catch (error) {
    console.error('Ultra simple login error:', error);
    throw error;
  }
};
