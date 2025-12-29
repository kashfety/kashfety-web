// Super Admin Authentication Middleware
import { supabaseAdmin } from "../utils/supabase.js";

// Log admin activity function
const logAdminActivity = async (adminId, actionType, targetType, targetId = null, actionDetails = {}, req) => {
    try {
        const ip = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
        const userAgent = req.get('User-Agent');

        await supabaseAdmin
            .from('admin_activity')
            .insert({
                admin_id: adminId,
                action_type: actionType,
                target_type: targetType,
                target_id: targetId,
                action_details: actionDetails,
                ip_address: ip,
                user_agent: userAgent,
                session_id: req.sessionId || null
            });
    } catch (error) {
        // Don't fail the request if logging fails
    }
};

// Enhanced auth middleware that works with unified users table and JWT tokens
export const verifyTokenEnhanced = async (req, res, next) => {
    try {
        
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: "No token provided",
            });
        }

        const token = authHeader.split(' ')[1];

        // Import JWT verification from auth middleware
        const { verifyToken } = await import('./auth.js');
        
        // Verify JWT token (standard authentication)
        let decodedToken;
        try {
            decodedToken = verifyToken(token);
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token",
            });
        }

        // Get user from unified users table using the decoded token ID
        const { data: userData, error: userError } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('id', decodedToken.id)
            .single();

        if (userError || !userData) {
            return res.status(403).json({
                success: false,
                message: "User not found in database",
            });
        }


        // Check if account is approved (using approval_status instead of is_active)
        if (userData.approval_status !== 'approved') {
            return res.status(403).json({
                success: false,
                message: "Account is not approved",
                details: {
                    approval_status: userData.approval_status
                }
            });
        }

        // Check for super admin or admin role
        if (!['super_admin', 'admin'].includes(userData.role)) {
            return res.status(403).json({
                success: false,
                message: "Insufficient permissions for admin operations",
            });
        }


        // Update last login for admin and super admin users (if columns exist)
        try {
            await supabaseAdmin
                .from('users')
                .update({
                    updated_at: new Date().toISOString()
                })
                .eq('id', userData.id);
        } catch (updateError) {
            // Don't fail the request if update fails
        }

        // Attach user to request
        req.user = {
            id: userData.id,
            uid: userData.uid,
            email: userData.email,
            phone: userData.phone,
            role: userData.role,
            name: userData.name || `${userData.first_name} ${userData.last_name}`,
            first_name: userData.first_name,
            last_name: userData.last_name,
            approval_status: userData.approval_status,
            permissions: userData.admin_permissions || {},
            jwt_payload: decodedToken
        };

        next();
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Authentication error",
        });
    }
};

// Check if user is a super admin
export const isSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (req.user.role !== "super_admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Super Admin privileges required.",
        });
    }

    next();
};

// Check if user is admin or super admin
export const isAdminOrSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (!['admin', 'super_admin'].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin or Super Admin privileges required.",
        });
    }

    next();
};

// Enhanced admin middleware that logs activity
export const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({
            success: false,
            message: "Access denied. Admin privileges required.",
        });
    }

    next();
};

// Middleware to log admin actions
export const logAdminAction = (actionType, targetType) => {
    return async (req, res, next) => {
        // Store original send function
        const originalSend = res.send;

        // Override send to log successful actions
        res.send = function (data) {
            if (res.statusCode >= 200 && res.statusCode < 300) {
                // Only log successful actions
                const targetId = req.params.id || req.params.userId || req.params.centerId || null;
                const actionDetails = {
                    method: req.method,
                    path: req.path,
                    query: req.query,
                    body: req.body ? Object.keys(req.body) : []
                };

                // Don't await this - log asynchronously
                if (req.user && ['admin', 'super_admin'].includes(req.user.role)) {
                    logAdminActivity(req.user.id, actionType, targetType, targetId, actionDetails, req);
                }
            }

            // Call original send
            originalSend.call(this, data);
        };

        next();
    };
};

// Check specific permissions for super admin features
export const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
            });
        }

        // Super admins have all permissions
        if (req.user.role === 'super_admin') {
            return next();
        }

        // Regular admins need specific permissions
        if (req.user.role === 'admin') {
            const permissions = req.user.permissions || {};
            if (permissions.all || permissions[permission]) {
                return next();
            }
        }

        return res.status(403).json({
            success: false,
            message: `Access denied. Required permission: ${permission}`,
        });
    };
};

// Enhanced middleware for user management operations
export const canManageUsers = requirePermission('user_management');

// Enhanced middleware for admin management operations (super admin only)
export const canManageAdmins = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: "Access denied. Super Admin privileges required for admin management.",
        });
    }

    next();
};

// Enhanced middleware for system settings (super admin only)
export const canManageSystemSettings = requirePermission('system_settings');

// Enhanced middleware for audit logs
export const canViewAuditLogs = requirePermission('audit_logs');

// Middleware to prevent self-modification for critical operations
export const preventSelfModification = (req, res, next) => {
    const targetUserId = req.params.userId || req.params.id;

    if (targetUserId && targetUserId === req.user.id) {
        return res.status(403).json({
            success: false,
            message: "Cannot perform this action on your own account",
        });
    }

    next();
};

// Check if user can access admin-level patient data
export const canAccessPatientDataAsAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    const userRole = req.user.role;

    // Super admin and admin can access all patient data
    if (['super_admin', 'admin'].includes(userRole)) {
        return next();
    }

    // Doctors can access their patients' data (handled in controller)
    if (userRole === 'doctor') {
        return next();
    }

    // Patients can only access their own data
    if (userRole === 'patient') {
        const requestedPatientId = req.params.patientId || req.params.id;
        if (requestedPatientId && requestedPatientId !== req.user.uid) {
            return res.status(403).json({
                success: false,
                message: "Access denied. You can only access your own data.",
            });
        }
        return next();
    }

    return res.status(403).json({
        success: false,
        message: "Access denied.",
    });
};

// Enhanced doctor access middleware
export const canAccessDoctorDataAsAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    const userRole = req.user.role;

    // Super admin and admin can access all doctor data
    if (['super_admin', 'admin'].includes(userRole)) {
        return next();
    }

    // Doctors can only access their own data
    if (userRole === 'doctor') {
        const requestedDoctorId = req.params.doctorId || req.params.id;
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
        message: "Access denied. Doctor, Admin, or Super Admin privileges required.",
    });
};

export { logAdminActivity };
