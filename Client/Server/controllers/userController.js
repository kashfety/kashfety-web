import { supabaseAdmin, authHelpers } from "../utils/supabase.js";
import User from "../models/User.js";
import Doctor from "../models/Doctor.js";
import Patient from "../models/Patient.js";

// Function to get default dashboard route based on role
function getRoleDefaultDashboard(role) {
  switch (role.toLowerCase()) {
    case "doctor":
      return "/doctor-dashboard";
    case "admin":
      return "/admin-dashboard";
    case "patient":
    default:
      return "/"; // Landing page for patients
  }
}

// User signup controller with comprehensive new structure
export const createUserAccount = async (req, res) => {
  try {
    const { email, password, name, firstName, lastName, phone, role } = req.body;

    console.log("Server received user account creation request with role:", role);

    // Validate that role is provided
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Role is required for registration",
      });
    }

    // Validate role is one of the allowed roles and normalize to lowercase
    const normalizedRole = role.toLowerCase();
    const allowedRoles = ['patient', 'doctor', 'admin'];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Use name if provided, otherwise construct from firstName and lastName
    const displayName = name || `${firstName || ''} ${lastName || ''}`.trim();

    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    // Create user with Supabase Auth
    const authData = await authHelpers.signUp(email, password, {
      data: {
        role: normalizedRole,
        name: displayName
      }
    });

    if (!authData?.user?.id) {
      return res.status(500).json({
        success: false,
        message: "Authentication succeeded but user ID not found",
      });
    }

    const userId = authData.user.id;
    const defaultDashboard = getRoleDefaultDashboard(normalizedRole);

    // Create user record in users table
    const userData = await User.createUser({
      uid: userId,
      email,
      name: displayName,
      phone,
      role: normalizedRole,
      default_dashboard: defaultDashboard
    });

    // Create role-specific profile
    let roleProfile = null;
    if (normalizedRole === 'doctor') {
      roleProfile = await Doctor.createDoctorProfile({
        user_id: userData.id,
        uid: userId,
        email,
        name: displayName,
        specialty: req.body.specialty || 'General',
        bio: req.body.bio || '',
        experience_years: req.body.experience_years || 0,
        consultation_fee: req.body.consultation_fee || 0
      });
    } else if (normalizedRole === 'patient') {
      roleProfile = await Patient.createPatientProfile({
        user_id: userData.id,
        uid: userId,
        email,
        name: displayName,
        phone: phone,
        gender: req.body.gender,
        date_of_birth: req.body.date_of_birth
      });
    }

    console.log(`Successfully created ${normalizedRole} account for: ${email}`);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      user: userData,
      profile: roleProfile,
      dashboard: defaultDashboard
    });

  } catch (error) {
    console.error("Account creation error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create account",
    });
  }
};

// User login controller with comprehensive data retrieval
export const authenticateUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Authenticate with Supabase Auth
    const authData = await authHelpers.signIn(email, password);

    if (!authData?.user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const userId = authData.user.id;

    // Get user data from users table
    const userData = await User.findByUid(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    // Get role-specific profile data
    let profileData = null;
    if (userData.role === 'doctor') {
      profileData = await Doctor.getDoctorByUid(userId);
    } else if (userData.role === 'patient') {
      profileData = await Patient.getPatientByUid(userId);
    }

    const dashboardPath = getRoleDefaultDashboard(userData.role);

    res.json({
      success: true,
      message: "Login successful",
      user: userData,
      profile: profileData,
      dashboard: dashboardPath,
      session: authData.session
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(401).json({
      success: false,
      message: error.message || "Authentication failed",
    });
  }
};

// Password reset controller
export const resetUserPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    await authHelpers.resetPassword(email);

    res.status(200).json({
      success: true,
      message: "Password reset email sent",
    });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to send password reset email",
    });
  }
};

// Get user profile with comprehensive data
export const getUserProfileData = async (req, res) => {
  try {
    const userId = req.params.uid;
    console.log("=== getUserProfileData called for userId:", userId);

    // Get comprehensive user data
    let userData = await User.getUserDashboardData(userId);
    console.log("=== Initial getUserDashboardData result:", userData ? "User found" : "User not found");

    if (!userData) {
      console.log("=== User not found in database, attempting to create from auth data");
      // User exists in Supabase Auth but not in our database
      // Try to get user info from Supabase Auth and create profile
      try {
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId);
        console.log("=== Supabase Auth query result:", authError ? `Error: ${authError.message}` : "Success");

        if (authError || !authUser?.user) {
          console.log("=== Could not find user in Supabase Auth");
          return res.status(404).json({
            success: false,
            message: "User not found in database",
          });
        }

        console.log("=== Found user in Supabase Auth, creating database profile");
        // Create user profile from auth data
        const newUserData = {
          uid: authUser.user.id,
          email: authUser.user.email,
          name: authUser.user.user_metadata?.name || authUser.user.email.split('@')[0],
          first_name: authUser.user.user_metadata?.first_name || null,
          last_name: authUser.user.user_metadata?.last_name || null,
          phone: authUser.user.user_metadata?.phone || null,
          role: authUser.user.user_metadata?.role || 'patient',
          default_dashboard: getRoleDefaultDashboard(authUser.user.user_metadata?.role || 'patient')
        };

        console.log("=== Creating user with data:", JSON.stringify(newUserData, null, 2));
        // Create user in database
        const createdUser = await User.createUser(newUserData);
        console.log("=== User created successfully:", createdUser.id);

        // Create role-specific profile if needed
        if (newUserData.role === 'doctor') {
          console.log("=== Creating doctor profile");
          await Doctor.createDoctorProfile({
            user_id: createdUser.id,
            uid: userId,
            email: newUserData.email,
            name: newUserData.name,
            specialty: 'General',
            bio: '',
            experience_years: 0,
            consultation_fee: 0
          });
        } else if (newUserData.role === 'patient') {
          console.log("=== Creating patient profile");
          await Patient.createPatientProfile({
            user_id: createdUser.id,
            uid: userId,
            email: newUserData.email,
            name: newUserData.name,
            phone: newUserData.phone,
            date_of_birth: null,
            gender: null
          });
        }

        // Get the newly created user data
        userData = await User.getUserDashboardData(userId);
        console.log("=== Retrieved newly created user data:", userData ? "Success" : "Failed");

      } catch (createError) {
        console.error("=== Error creating user from auth data:", createError);
        return res.status(404).json({
          success: false,
          message: "User not found in database",
        });
      }
    }

    console.log("=== Returning user data successfully");
    res.status(200).json({
      success: true,
      user: userData,
    });
  } catch (error) {
    console.error("=== Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve user profile",
    });
  }
};

// Update user profile
export const updateUserProfileData = async (req, res) => {
  try {
    const userId = req.params.uid;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.uid;
    delete updates.created_at;

    const updatedUser = await User.updateUser(userId, updates);

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update profile",
    });
  }
};

// Get all users (admin only)
export const getAllUsersData = async (req, res) => {
  try {
    const users = await User.getAllUsers();

    res.status(200).json({
      success: true,
      users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve users",
    });
  }
};

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const userId = req.params.uid;
    const { role } = req.body;

    if (!role || !['patient', 'doctor', 'admin'].includes(role.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    const normalizedRole = role.toLowerCase();
    const defaultDashboard = getRoleDefaultDashboard(normalizedRole);

    const updatedUser = await User.updateUser(userId, {
      role: normalizedRole,
      default_dashboard: defaultDashboard
    });

    res.json({
      success: true,
      message: "User role updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update user role",
    });
  }
};

// Delete user account
export const deleteUserAccount = async (req, res) => {
  try {
    const userId = req.params.uid;

    const deletedUser = await User.deleteUser(userId);

    res.json({
      success: true,
      message: "User account deleted successfully",
      user: deletedUser
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete user account",
    });
  }
};

// Legacy exports for backward compatibility
export const signup = createUserAccount;
export const login = authenticateUser;
export const resetPassword = resetUserPassword;
export const getUserProfile = getUserProfileData;
export const updateUserProfile = updateUserProfileData;
export const getAllUsers = getAllUsersData;