import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import serverless from "serverless-http";

// Load environment variables
dotenv.config();

// UNIFIED ROUTES (Primary - no Supabase Auth dependencies)
import { unifiedAuthRoutes } from "./routes/unified-auth.js";

// Doctor Dashboard Routes (Comprehensive endpoints for doctor dashboard)
import doctorDashboardRoutes from "./routes/doctor-dashboard.js";

// Center Dashboard Routes (Comprehensive endpoints for center dashboard)
import centerDashboardRoutes from "./routes/center-dashboard.js";

// Legacy routes for backward compatibility
import userRoutes from "./routes/userRoutes.js";
import doctorRoutes from "./routes/doctorRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import centerRoutes from "./routes/centerRoutes.js";
import patientRoutes from "./routes/patientRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";

// New comprehensive management routes
import doctorManagement from "./routes/doctorManagement.js";
import patientManagement from "./routes/patientManagement.js";
import appointmentManagement from "./routes/appointmentManagement.js";

// ULTRA SIMPLIFIED ROUTES (no auth.users dependencies)
import ultraSimplifiedAppointments from "./routes/ultraSimplifiedAppointments.js";

// CENTER-SPECIFIC SCHEDULING ROUTES (New Implementation)
import centerSpecificRoutes from "./routes/centers.js";
import doctorCenterRoutes from "./routes/doctors.js";

// ADMIN ROUTES
import adminRoutes from "./routes/admin.js";

// SUPER ADMIN ROUTES
import superAdminRoutes from "./routes/super-admin.js";

import { seedDatabase } from "./utils/seedDatabase.js";

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware - Enhanced CORS for production deployment
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // List of allowed origins including Vercel preview deployments
    const allowedOrigins = [
      'https://kashfety-web-git-develop-kashfetys-projects.vercel.app',
      'https://kashfety-web.vercel.app',
      'https://kashfety-fxlohki19-kashfetys-projects.vercel.app',
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5000',
    ];

    // Also check environment variable for additional origins
    if (process.env.ALLOWED_ORIGINS) {
      const envOrigins = process.env.ALLOWED_ORIGINS.split(',');
      allowedOrigins.push(...envOrigins);
    }

    // Check if origin matches any allowed pattern (including Vercel preview URLs)
    const isAllowed = allowedOrigins.some(allowed => origin.includes(allowed.replace('https://', ''))) 
      || origin.endsWith('.vercel.app')
      || origin.includes('kashfety');

    if (isAllowed || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS request from origin:', origin);
      callback(null, true); // Allow all for now to prevent blocking
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger to debug banner routes
app.use((req, res, next) => {
  if (req.path.includes('/banners')) {
    console.log('🔍 REQUEST TO BANNERS:', {
      method: req.method,
      path: req.path,
      fullUrl: req.originalUrl,
      headers: req.headers.authorization ? 'Has Auth Token' : 'No Auth Token'
    });
  }
  next();
});

// Ensure local uploads directory exists and serve statically
const uploadsDir = path.join(process.cwd(), "uploads");
const labResultsDir = path.join(uploadsDir, "lab-results");
const certificatesDir = path.join(uploadsDir, "certificates");
try {
  fs.mkdirSync(labResultsDir, { recursive: true });
  fs.mkdirSync(certificatesDir, { recursive: true });
} catch { }
app.use("/uploads", express.static(uploadsDir));

// ========================================
// PRIMARY UNIFIED ROUTES (No Supabase Auth)
// ========================================
app.use("/api/auth", unifiedAuthRoutes);

// ========================================
// DOCTOR DASHBOARD ROUTES (Optimized for Frontend)
// ========================================
app.use("/api/doctor-dashboard", doctorDashboardRoutes);

// ========================================
// CENTER DASHBOARD ROUTES (Optimized for Frontend)
// ========================================
app.use("/api/center-dashboard", centerDashboardRoutes);

// ULTRA SIMPLIFIED ROUTES (Alternative - no auth dependencies)
app.use("/api/ultra-appointments", ultraSimplifiedAppointments);

// Comprehensive API Routes with descriptive names
app.use("/api/user-management", userRoutes);
app.use("/api/doctor-management", doctorManagement);
app.use("/api/patient-management", patientManagement);
app.use("/api/appointment-management", appointmentManagement);

// Legacy routes for backward compatibility
app.use("/api/users", userRoutes);
app.use("/api/doctors", doctorRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/centers", centerRoutes);
app.use("/api/patients", patientRoutes);
app.use("/api/schedule", scheduleRoutes);

// CENTER-SPECIFIC SCHEDULING ROUTES (No Auth Required)
app.use("/api/center-schedule", centerSpecificRoutes);
app.use("/api/doctor-schedule", doctorCenterRoutes);

// ADMIN ROUTES
app.use("/api/auth/admin", adminRoutes);
app.use("/api/admin", adminRoutes); // Additional mount for frontend compatibility

// SUPER ADMIN ROUTES
app.use("/api/super-admin", superAdminRoutes);

// Basic route
app.get("/", (req, res) => {
  res.json({
    message: "Doctor Appointment API - NO AUTHORIZATION REQUIRED",
    version: "4.0.0",
    database: "Supabase PostgreSQL with Unified Users Table",
    authentication: "NONE - Direct access to all endpoints",
    endpoints: {
      unified_routes: "/api/auth",
      create_user: "POST /api/auth/register",
      simple_login: "POST /api/auth/login (email only)",
      appointments: "/api/auth/appointments",
      doctors: "/api/auth/doctors",
      patients: "/api/auth/patients",
      all_users: "/api/auth/users",
      center_scheduling: "/api/center-schedule",
      doctor_scheduling: "/api/doctor-schedule"
    },
    new_center_specific_endpoints: {
      centers: "GET /api/center-schedule - Get all centers with doctor counts",
      center_doctors: "GET /api/center-schedule/:centerId/doctors - Get doctors by center",
      doctor_slots: "GET /api/doctor-schedule/:doctorId/available-slots?date=YYYY-MM-DD&center_id=UUID",
      doctor_centers: "GET /api/doctor-schedule/:doctorId/centers - Get doctor's assigned centers",
      doctor_working_days: "GET /api/doctor-schedule/:doctorId/working-days?center_id=UUID"
    }
  });
});

// API Documentation endpoint
app.get("/api", (req, res) => {
  res.json({
    message: "Comprehensive Healthcare Management System API",
    version: "5.0.0",
    description: "Complete healthcare system with advanced features",
    authentication: "JWT Bearer Token Authentication",

    // ========================================
    // AUTHENTICATION ENDPOINTS
    // ========================================
    authentication: {
      register: "POST /api/auth/register",
      login: "POST /api/auth/login",
      verify: "GET /api/auth/verify (requires token)",
      description: "User registration and authentication system"
    },

    // ========================================
    // DOCTOR ENDPOINTS
    // ========================================
    doctor_endpoints: {
      profile: {
        get: "GET /api/auth/doctor/profile",
        update: "PUT /api/auth/doctor/profile"
      },
      schedule: {
        get: "GET /api/auth/doctor/schedule",
        create: "POST /api/auth/doctor/schedule"
      },
      statistics: {
        today_stats: "GET /api/auth/doctor/today-stats",
        analytics: "GET /api/auth/doctor/analytics"
      },
      patients: "GET /api/auth/doctor/patients",
      medical_centers: {
        list: "GET /api/auth/doctor/centers",
        create: "POST /api/auth/doctor/centers",
        update: "PUT /api/auth/doctor/centers/:id",
        delete: "DELETE /api/auth/doctor/centers/:id",
        set_primary: "POST /api/auth/doctor/centers/:id/primary"
      },
      medical_actions: {
        order_lab_test: "POST /api/auth/doctor/lab-tests/order",
        create_prescription: "POST /api/auth/doctor/prescriptions",
        home_visits: "GET /api/auth/doctor/home-visits",
        update_home_visit: "PUT /api/auth/doctor/home-visits/:id/status"
      }
    },

    // ========================================
    // PATIENT ENDPOINTS
    // ========================================
    patient_endpoints: {
      profile: {
        get: "GET /api/auth/patient/profile",
        update: "PUT /api/auth/patient/profile"
      },
      dashboard: {
        stats: "GET /api/auth/patient/stats",
        medical_records: "GET /api/auth/patient/medical-records",
        prescriptions: "GET /api/auth/patient/prescriptions",
        lab_tests: "GET /api/auth/patient/lab-tests",
        billing: "GET /api/auth/patient/billing"
      },
      home_visits: {
        request: "POST /api/auth/patient/home-visit/request",
        list: "GET /api/auth/patient/home-visits"
      }
    },

    // ========================================
    // APPOINTMENT SYSTEM
    // ========================================
    appointments: {
      book: "POST /api/auth/appointments",
      get_user_appointments: "GET /api/auth/appointments/:userId",
      get_all: "GET /api/auth/appointments",
      reschedule: "PUT /api/auth/appointments/:id/reschedule",
      cancel: "PUT /api/auth/appointments/:id/cancel",
      availability: "GET /api/auth/appointments/availability",
      doctor_slots: "GET /api/auth/doctors/:id/available-slots"
    },

    // ========================================
    // MESSAGING SYSTEM
    // ========================================
    messaging: {
      conversations: {
        list: "GET /api/messaging/conversations",
        create: "POST /api/messaging/conversations"
      },
      messages: {
        get: "GET /api/messaging/conversations/:id/messages",
        send: "POST /api/messaging/conversations/:id/messages",
        unread_count: "GET /api/messaging/messages/unread-count"
      },
      video_consultation: {
        create: "POST /api/messaging/video-consultation/create",
        list: "GET /api/messaging/video-consultations",
        join: "POST /api/messaging/video-consultation/:id/join",
        end: "POST /api/messaging/video-consultation/:id/end"
      }
    },

    // ========================================
    // ADMIN DASHBOARD
    // ========================================
    admin_endpoints: {
      dashboard: "GET /api/admin/dashboard/stats",
      user_management: {
        list_users: "GET /api/admin/users",
        update_status: "PUT /api/admin/users/:id/status",
        delete_user: "DELETE /api/admin/users/:id"
      },
      system: {
        appointments: "GET /api/admin/appointments",
        analytics: "GET /api/admin/analytics",
        settings: "GET /api/admin/settings",
        update_setting: "PUT /api/admin/settings/:id",
        backup: "POST /api/admin/backup"
      }
    },

    // ========================================
    // MEDICAL SYSTEM
    // ========================================
    medical_system: {
      records: "POST /api/auth/medical-records",
      notifications: {
        list: "GET /api/auth/notifications",
        mark_read: "PUT /api/auth/notifications/:id/read"
      },
      payment: {
        process: "POST /api/auth/payment/process"
      }
    },

    // ========================================
    // PUBLIC ENDPOINTS
    // ========================================
    public_endpoints: {
      doctors: "GET /api/auth/doctors",
      patients: "GET /api/auth/patients",
      users: "GET /api/auth/users"
    },

    // ========================================
    // FEATURES OVERVIEW
    // ========================================
    features: {
      comprehensive_auth: "JWT-based authentication with role management",
      doctor_dashboard: "Complete doctor profile, schedule, and analytics",
      patient_portal: "Patient profile, medical history, and appointments",
      appointment_system: "Advanced booking with availability checking",
      messaging: "Real-time doctor-patient communication",
      video_consultations: "Video call integration for remote consultations",
      home_visits: "Home visit request and management system",
      medical_records: "Comprehensive medical record management",
      prescriptions: "Digital prescription system",
      lab_tests: "Lab test ordering and result management",
      billing_payments: "Billing and payment processing",
      notifications: "Real-time notification system",
      admin_dashboard: "Complete system administration",
      analytics: "Advanced analytics and reporting",
      multi_center: "Medical center management for doctors"
    },

    // ========================================
    // DATABASE SCHEMA
    // ========================================
    database_tables: {
      core: ["users", "doctors", "patients", "appointments"],
      medical: ["medical_records", "prescriptions", "lab_tests"],
      communication: ["conversations", "messages", "notifications"],
      business: ["billing", "doctor_centers", "doctor_schedules"],
      advanced: ["home_visits", "video_consultations"],
      admin: ["system_settings", "system_backups"]
    },

    // ========================================
    // TESTING
    // ========================================
    testing: {
      comprehensive_test: "Run 'node test-all-apis.mjs' in Server directory",
      database_setup: "Execute 'enhanced-healthcare-schema.sql' in Supabase",
      postman_collection: "Import API endpoints for testing"
    },

    note: "All endpoints marked with 'requires token' need Authorization header with Bearer token"
  });
});

// Only start the server if not in Vercel serverless environment
if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Export the app for Vercel serverless functions
// Vercel uses Node.js req/res, so we can use the app directly
export default app;

// Also export serverless-wrapped version for compatibility
export const handler = serverless(app);