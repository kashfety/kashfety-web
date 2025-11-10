import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin Analytics] Request received');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials');
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch all data in parallel
    const [
      { data: userStats, error: userError },
      { data: appointmentStats, error: appointmentError },
      { data: centerStats, error: centerError },
      { data: labBookings, error: labError }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('role, created_at, date_of_birth, gender, specialty'),
      supabase
        .from('appointments')
        .select('status, created_at, appointment_date, consultation_fee, appointment_type'),
      supabase
        .from('centers')
        .select('*'),
      supabase
        .from('lab_bookings')
        .select('status, created_at, booking_date, fee, total_amount, amount, price, cost')
    ]);

    if (userError) {
      console.error('❌ Failed to fetch user stats:', userError);
      throw userError;
    }
    if (appointmentError) {
      console.error('❌ Failed to fetch appointment stats:', appointmentError);
      throw appointmentError;
    }
    if (centerError) {
      console.error('❌ Failed to fetch center stats:', centerError);
      throw centerError;
    }
    // Lab bookings error is not critical, just log it
    if (labError) {
      console.warn('⚠️ Failed to fetch lab bookings:', labError);
    }

    // Calculate current date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Generate daily appointment trends (last 7 days)
    const dailyAppointments = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      const count = (appointmentStats || []).filter((apt: any) => 
        apt.created_at && apt.created_at.startsWith(dateStr)
      ).length;
      
      dailyAppointments.push({
        date: dateStr,
        count: count
      });
    }

    // Generate monthly user growth (last 6 months)
    const monthlyGrowth = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      const doctorsCount = (userStats || []).filter((u: any) => 
        u.role === 'doctor' && 
        u.created_at &&
        new Date(u.created_at) >= date && 
        new Date(u.created_at) < nextMonth
      ).length;
      
      const patientsCount = (userStats || []).filter((u: any) => 
        u.role === 'patient' && 
        u.created_at &&
        new Date(u.created_at) >= date && 
        new Date(u.created_at) < nextMonth
      ).length;
      
      monthlyGrowth.push({
        month: monthStr,
        doctors: doctorsCount,
        patients: patientsCount
      });
    }

    // Generate monthly revenue (last 6 months) - includes both appointments and lab bookings
    const monthlyRevenue = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthStr = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      // Revenue from appointments
      const appointmentRevenue = (appointmentStats || [])
        .filter((apt: any) => {
          if (!apt.created_at) return false;
          const aptDate = new Date(apt.created_at);
          return aptDate >= date && aptDate < nextMonth;
        })
        .reduce((sum: number, apt: any) => sum + (Number(apt.consultation_fee) || 0), 0);

      // Revenue from lab bookings
      const labRevenue = (labBookings || [])
        .filter((booking: any) => {
          if (!booking.created_at) return false;
          const bookingDate = new Date(booking.created_at);
          return bookingDate >= date && bookingDate < nextMonth;
        })
        .reduce((sum: number, booking: any) => {
          const amount = booking.total_amount || booking.amount || booking.fee || booking.price || booking.cost || 0;
          return sum + (Number(amount) || 0);
        }, 0);
      
      monthlyRevenue.push({
        month: monthStr,
        amount: appointmentRevenue + labRevenue
      });
    }

    // Calculate appointment status distribution
    const statusDistribution = [
      { 
        status: 'Completed', 
        count: (appointmentStats || []).filter((a: any) => a.status === 'completed').length,
        color: '#00C49F'
      },
      { 
        status: 'Scheduled', 
        count: (appointmentStats || []).filter((a: any) => a.status === 'scheduled').length,
        color: '#0088FE'
      },
      { 
        status: 'Cancelled', 
        count: (appointmentStats || []).filter((a: any) => a.status === 'cancelled').length,
        color: '#FF8042'
      },
      { 
        status: 'No Show', 
        count: (appointmentStats || []).filter((a: any) => a.status === 'no_show').length,
        color: '#FFBB28'
      }
    ];

    // Calculate total users by role for pie chart
    const totalByRole = [
      { role: 'Patients', count: (userStats || []).filter((u: any) => u.role === 'patient').length },
      { role: 'Doctors', count: (userStats || []).filter((u: any) => u.role === 'doctor').length },
      { role: 'Centers', count: (userStats || []).filter((u: any) => u.role === 'center').length },
      { role: 'Admins', count: (userStats || []).filter((u: any) => u.role === 'admin' || u.role === 'super_admin').length }
    ];

    // Calculate demographics
    const demographics = {
      gender: {
        male: (userStats || []).filter((u: any) => u.gender === 'male').length,
        female: (userStats || []).filter((u: any) => u.gender === 'female').length,
        other: (userStats || []).filter((u: any) => u.gender && !['male', 'female'].includes(u.gender)).length
      },
      specialties: (userStats || [])
        .filter((u: any) => u.role === 'doctor' && u.specialty)
        .reduce((acc: Record<string, number>, doctor: any) => {
          acc[doctor.specialty] = (acc[doctor.specialty] || 0) + 1;
          return acc;
        }, {}),
      ageGroups: (() => {
        const ageGroups: Record<string, number> = { '18-30': 0, '31-50': 0, '51+': 0 };
        (userStats || []).forEach((user: any) => {
          if (user.date_of_birth) {
            const age = new Date().getFullYear() - new Date(user.date_of_birth).getFullYear();
            if (age >= 18 && age <= 30) ageGroups['18-30']++;
            else if (age >= 31 && age <= 50) ageGroups['31-50']++;
            else if (age > 50) ageGroups['51+']++;
          }
        });
        return ageGroups;
      })()
    };

    // Calculate appointment type breakdown
    const appointmentTypeBreakdown = {
      consultation: (appointmentStats || []).filter((a: any) => a.appointment_type === 'consultation' || !a.appointment_type).length,
      'follow-up': (appointmentStats || []).filter((a: any) => a.appointment_type === 'follow-up').length,
      emergency: (appointmentStats || []).filter((a: any) => a.appointment_type === 'emergency').length,
      'home-visit': (appointmentStats || []).filter((a: any) => a.appointment_type === 'home-visit').length
    };

    // Calculate total revenue from both sources
    const totalAppointmentRevenue = (appointmentStats || [])
      .reduce((sum: number, apt: any) => sum + (Number(apt.consultation_fee) || 0), 0);
    
    const totalLabRevenue = (labBookings || [])
      .reduce((sum: number, booking: any) => {
        const amount = booking.total_amount || booking.amount || booking.fee || booking.price || booking.cost || 0;
        return sum + (Number(amount) || 0);
      }, 0);

    const totalRevenue = totalAppointmentRevenue + totalLabRevenue;

    // Process comprehensive analytics
    const analytics = {
      appointments: {
        daily: dailyAppointments,
        statusDistribution: statusDistribution,
        typeBreakdown: appointmentTypeBreakdown
      },
      users: {
        growth: monthlyGrowth,
        totalByRole: totalByRole
      },
      demographics: demographics,
      revenue: {
        monthly: monthlyRevenue
      },
      summary: {
        totalUsers: (userStats || []).length,
        totalAppointments: (appointmentStats || []).length,
        totalRevenue: totalRevenue,
        totalCenters: (centerStats || []).length,
        totalPatients: (userStats || []).filter((u: any) => u.role === 'patient').length,
        totalDoctors: (userStats || []).filter((u: any) => u.role === 'doctor').length,
        thisMonthAppointments: (appointmentStats || []).filter((a: any) => {
          if (!a.created_at) return false;
          const created = new Date(a.created_at);
          return created >= startOfMonth;
        }).length,
        thisMonthRevenue: (appointmentStats || [])
          .filter((a: any) => {
            if (!a.created_at) return false;
            return new Date(a.created_at) >= startOfMonth;
          })
          .reduce((sum: number, apt: any) => sum + (Number(apt.consultation_fee) || 0), 0) +
          (labBookings || [])
            .filter((b: any) => {
              if (!b.created_at) return false;
              return new Date(b.created_at) >= startOfMonth;
            })
            .reduce((sum: number, booking: any) => {
              const amount = booking.total_amount || booking.amount || booking.fee || booking.price || booking.cost || 0;
              return sum + (Number(amount) || 0);
            }, 0)
      }
    };

    console.log('✅ [Admin Analytics] Generated analytics successfully', {
      totalUsers: analytics.summary.totalUsers,
      totalAppointments: analytics.summary.totalAppointments,
      totalRevenue: analytics.summary.totalRevenue,
      appointmentRevenue: totalAppointmentRevenue,
      labRevenue: totalLabRevenue
    });

    return NextResponse.json({
      success: true,
      data: analytics
    });

  } catch (error: any) {
    console.error('❌ Admin analytics API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

