import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Verify JWT token and extract user info
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (error) {
    return null;
  }
}

interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  details: string;
  ip_address: string;
  user_agent: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  console.log('📋 Audit logs endpoint hit!');
  
  try {
    // Get authorization token
    const authHeader = request.headers.get('authorization');
    console.log('🔑 Auth header present:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    console.log('🔓 Token decoded:', !!decoded, 'Role:', decoded?.role);

    if (!decoded) {
      console.log('❌ Invalid token');
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }

    // Check if user is admin or super_admin
    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      console.log('❌ User is not admin/super_admin, role:', decoded.role);
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const action = searchParams.get('action');
    const resource_type = searchParams.get('resource_type');
    const user_id = searchParams.get('user_id');
    const start_date = searchParams.get('start_date');
    const end_date = searchParams.get('end_date');
    const offset = (page - 1) * limit;

    console.log('📝 Fetching audit logs - Page:', page, 'Limit:', limit, 'Filters:', { action, resource_type, user_id, start_date, end_date });

    let auditLogs: AuditLog[] = [];

    // 1. Get user registrations
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at, approval_status, updated_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!usersError && users) {
      users.forEach((user: any) => {
        auditLogs.push({
          id: `user_reg_${user.id}`,
          created_at: user.created_at,
          user_id: user.id,
          action: 'REGISTER',
          resource_type: 'users',
          resource_id: user.id,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
          },
          details: `User registered as ${user.role}`,
          ip_address: 'system',
          user_agent: 'system'
        });

        // Add approval status changes if not pending
        if (user.approval_status !== 'pending') {
          auditLogs.push({
            id: `user_status_${user.id}`,
            created_at: user.updated_at || user.created_at,
            user_id: 'system',
            action: user.approval_status === 'approved' ? 'APPROVE' : 'REJECT',
            resource_type: 'users',
            resource_id: user.id,
            user: {
              id: 'system',
              name: 'System Admin',
              email: 'system@doctorapp.com',
              role: 'admin'
            },
            details: `User ${user.approval_status}`,
            ip_address: 'system',
            user_agent: 'system'
          });
        }
      });
    }

    // 2. Get certificate submissions and reviews
    const { data: certificates, error: certError } = await supabase
      .from('doctor_certificates')
      .select(`
        id,
        doctor_id,
        status,
        submitted_at,
        reviewed_at,
        reviewed_by,
        doctor:users!doctor_id(id, name, email, role)
      `)
      .order('submitted_at', { ascending: false })
      .limit(30);

    if (!certError && certificates) {
      certificates.forEach((cert: any) => {
        // Certificate submission
        auditLogs.push({
          id: `cert_submit_${cert.id}`,
          created_at: cert.submitted_at,
          user_id: cert.doctor_id,
          action: 'SUBMIT',
          resource_type: 'certificates',
          resource_id: cert.id,
          user: cert.doctor,
          details: 'Certificate submitted for review',
          ip_address: 'unknown',
          user_agent: 'unknown'
        });

        // Certificate review if reviewed
        if (cert.reviewed_at && cert.reviewed_by) {
          auditLogs.push({
            id: `cert_review_${cert.id}`,
            created_at: cert.reviewed_at,
            user_id: cert.reviewed_by,
            action: cert.status === 'approved' ? 'APPROVE' : 'REJECT',
            resource_type: 'certificates',
            resource_id: cert.id,
            user: {
              id: cert.reviewed_by,
              name: 'Admin User',
              email: 'admin@doctorapp.com',
              role: 'admin'
            },
            details: `Certificate ${cert.status}`,
            ip_address: 'admin',
            user_agent: 'admin'
          });
        }
      });
    }

    // 3. Get appointments
    const { data: appointments, error: appointmentsError } = await supabase
      .from('appointments')
      .select(`
        id,
        doctor_id,
        patient_id,
        status,
        created_at,
        updated_at,
        doctor:users!doctor_id(id, name, email, role),
        patient:users!patient_id(id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(30);

    if (!appointmentsError && appointments) {
      appointments.forEach((appointment: any) => {
        // Appointment creation
        auditLogs.push({
          id: `appointment_create_${appointment.id}`,
          created_at: appointment.created_at,
          user_id: appointment.patient_id,
          action: 'CREATE',
          resource_type: 'appointments',
          resource_id: appointment.id,
          user: appointment.patient,
          details: `Appointment booked with ${appointment.doctor?.name || 'doctor'}`,
          ip_address: 'unknown',
          user_agent: 'unknown'
        });

        // Appointment status changes
        if (appointment.status !== 'scheduled' && appointment.updated_at !== appointment.created_at) {
          auditLogs.push({
            id: `appointment_update_${appointment.id}`,
            created_at: appointment.updated_at,
            user_id: appointment.doctor_id,
            action: 'UPDATE',
            resource_type: 'appointments',
            resource_id: appointment.id,
            user: appointment.doctor,
            details: `Appointment status changed to ${appointment.status}`,
            ip_address: 'unknown',
            user_agent: 'unknown'
          });
        }
      });
    }

    // 4. Get centers
    const { data: centers, error: centersError } = await supabase
      .from('centers')
      .select(`
        id,
        name,
        owner_doctor_id,
        approval_status,
        created_at,
        updated_at,
        owner:users!owner_doctor_id(id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!centersError && centers) {
      centers.forEach((center: any) => {
        auditLogs.push({
          id: `center_create_${center.id}`,
          created_at: center.created_at,
          user_id: center.owner_doctor_id,
          action: 'CREATE',
          resource_type: 'centers',
          resource_id: center.id,
          user: center.owner,
          details: `Medical center "${center.name}" created`,
          ip_address: 'unknown',
          user_agent: 'unknown'
        });
      });
    }

    // 5. Get medical records
    const { data: medicalRecords, error: recordsError } = await supabase
      .from('medical_records')
      .select(`
        id,
        patient_id,
        doctor_id,
        record_type,
        title,
        created_at,
        doctor:users!doctor_id(id, name, email, role),
        patient:users!patient_id(id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!recordsError && medicalRecords) {
      medicalRecords.forEach((record: any) => {
        auditLogs.push({
          id: `record_create_${record.id}`,
          created_at: record.created_at,
          user_id: record.doctor_id,
          action: 'CREATE',
          resource_type: 'medical_records',
          resource_id: record.id,
          user: record.doctor,
          details: `Created ${record.record_type} record: "${record.title}" for ${record.patient?.name || 'patient'}`,
          ip_address: 'unknown',
          user_agent: 'unknown'
        });
      });
    }

    // 6. Get reviews
    const { data: reviews, error: reviewsError } = await supabase
      .from('doctor_reviews')
      .select(`
        id,
        doctor_id,
        patient_id,
        rating,
        created_at,
        doctor:users!doctor_id(id, name, email, role),
        patient:users!patient_id(id, name, email, role)
      `)
      .order('created_at', { ascending: false })
      .limit(15);

    if (!reviewsError && reviews) {
      reviews.forEach((review: any) => {
        auditLogs.push({
          id: `review_create_${review.id}`,
          created_at: review.created_at,
          user_id: review.patient_id,
          action: 'CREATE',
          resource_type: 'reviews',
          resource_id: review.id,
          user: review.patient,
          details: `Left ${review.rating}-star review for Dr. ${review.doctor?.name || 'Unknown'}`,
          ip_address: 'unknown',
          user_agent: 'unknown'
        });
      });
    }

    // Sort all logs by date (most recent first)
    auditLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Apply filters
    let filteredLogs = auditLogs;

    if (action && action !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }

    if (resource_type && resource_type !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.resource_type === resource_type);
    }

    if (user_id) {
      filteredLogs = filteredLogs.filter(log => log.user_id === user_id);
    }

    if (start_date) {
      filteredLogs = filteredLogs.filter(log => new Date(log.created_at) >= new Date(start_date));
    }

    if (end_date) {
      filteredLogs = filteredLogs.filter(log => new Date(log.created_at) <= new Date(end_date));
    }

    // Apply pagination
    const totalLogs = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + limit);
    const totalPages = Math.ceil(totalLogs / limit);

    console.log(`✅ Admin: Generated ${paginatedLogs.length} audit logs from system data (${totalLogs} total)`);

    return NextResponse.json({
      success: true,
      data: {
        logs: paginatedLogs,
        pagination: {
          currentPage: page,
          totalPages,
          totalLogs,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Audit logs endpoint error:', error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: 'Failed to fetch audit logs',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
