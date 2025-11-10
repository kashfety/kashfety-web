import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [Admin Dashboard Stats] Request received');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get date range (default to last 30 days)
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const endDate = new Date();

    // Fetch all counts in parallel
    const [
      { count: totalUsers },
      { count: totalPatients },
      { count: totalDoctors },
      { count: totalAdmins },
      { count: totalSuperAdmins },
      { count: totalCenters },
      { count: totalAppointments },
      { data: recentAppointments },
      { data: appointments },
      { data: labBookings },
      { data: users }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'patient'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'doctor'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'super_admin'),
      supabase.from('centers').select('*', { count: 'exact', head: true }),
      supabase.from('appointments').select('*', { count: 'exact', head: true }),
      supabase.from('appointments')
        .select('*')
        .gte('appointment_date', startDate.toISOString().split('T')[0])
        .lte('appointment_date', endDate.toISOString().split('T')[0])
        .limit(10)
        .order('appointment_date', { ascending: false }),
      supabase.from('appointments')
        .select('status, appointment_type, appointment_date, consultation_fee')
        .gte('appointment_date', startDate.toISOString().split('T')[0])
        .lte('appointment_date', endDate.toISOString().split('T')[0]),
      supabase.from('lab_bookings')
        .select('status, booking_date, fee, total_amount, amount, price, cost')
        .gte('booking_date', startDate.toISOString().split('T')[0])
        .lte('booking_date', endDate.toISOString().split('T')[0]),
      supabase.from('users')
        .select('gender, date_of_birth, specialty')
        .in('role', ['patient', 'doctor'])
    ]);

    // Calculate revenue from appointments (doctor consultations)
    const appointmentRevenue = (appointments || [])
      .filter((apt: any) => apt.consultation_fee && ['completed', 'confirmed'].includes(apt.status))
      .reduce((sum: number, apt: any) => sum + (Number(apt.consultation_fee) || 0), 0);

    // Calculate revenue from lab bookings (center lab tests)
    const labRevenue = (labBookings || [])
      .filter((booking: any) => {
        // Only count completed or confirmed lab bookings
        return ['completed', 'confirmed', 'scheduled'].includes(booking.status);
      })
      .reduce((sum: number, booking: any) => {
        // Try different field names for fee/amount
        const amount = booking.total_amount || booking.amount || booking.fee || booking.price || booking.cost || 0;
        return sum + (Number(amount) || 0);
      }, 0);

    // Total revenue from both sources
    const totalRevenue = appointmentRevenue + labRevenue;
    const totalTransactions = (appointments || []).filter((apt: any) => apt.consultation_fee && ['completed', 'confirmed'].includes(apt.status)).length +
                              (labBookings || []).filter((booking: any) => ['completed', 'confirmed', 'scheduled'].includes(booking.status)).length;
    
    const averageRevenue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Status breakdown
    const statusBreakdown: Record<string, number> = {};
    (appointments || []).forEach((apt: any) => {
      const status = apt.status || 'unknown';
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
    });

    // Type breakdown
    const typeBreakdown: Record<string, number> = {};
    (appointments || []).forEach((apt: any) => {
      const type = apt.appointment_type || 'unknown';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    // Daily trends
    const dailyTrends: Record<string, number> = {};
    (appointments || []).forEach((apt: any) => {
      const date = apt.appointment_date || '';
      if (date) {
        dailyTrends[date] = (dailyTrends[date] || 0) + 1;
      }
    });

    // Demographics - filter to only patients for patient demographics
    const specialties: Record<string, number> = {};
    const gender: Record<string, number> = {};
    const ageGroups: Record<string, number> = {};

    // Filter to only patients for patient demographics
    const patients = (users || []).filter((u: any) => u.role === 'patient');

    patients.forEach((user: any) => {
      // Gender - normalize to lowercase to avoid duplicates
      if (user.gender) {
        const normalizedGender = user.gender.toLowerCase().trim();
        if (normalizedGender === 'male' || normalizedGender === 'female' || normalizedGender === 'other') {
          gender[normalizedGender] = (gender[normalizedGender] || 0) + 1;
        }
      }
      
      // Age groups
      if (user.date_of_birth) {
        const birthDate = new Date(user.date_of_birth);
        const age = Math.floor((endDate.getTime() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        let ageGroup = '';
        if (age < 18) ageGroup = '0-17';
        else if (age < 30) ageGroup = '18-29';
        else if (age < 45) ageGroup = '30-44';
        else if (age < 60) ageGroup = '45-59';
        else ageGroup = '60+';
        ageGroups[ageGroup] = (ageGroups[ageGroup] || 0) + 1;
      }
    });

    // Specialties (for doctors) - count all doctors
    (users || []).forEach((user: any) => {
      if (user.specialty) {
        specialties[user.specialty] = (specialties[user.specialty] || 0) + 1;
      }
    });

    const stats = {
      overview: {
        totalUsers: totalUsers || 0,
        totalPatients: totalPatients || 0,
        totalDoctors: totalDoctors || 0,
        totalAdmins: totalAdmins || 0,
        totalSuperAdmins: totalSuperAdmins || 0,
        totalCenters: totalCenters || 0,
        totalAppointments: totalAppointments || 0,
        recentAppointments: recentAppointments?.length || 0,
        totalRevenue,
        averageRevenue,
        // Revenue breakdown by source
        revenueBreakdown: {
          appointments: appointmentRevenue,
          labBookings: labRevenue
        }
      },
      appointments: {
        statusBreakdown,
        typeBreakdown,
        dailyTrends
      },
      demographics: {
        specialties,
        gender,
        ageGroups
      },
      period: {
        days,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    };

    console.log('✅ [Admin Dashboard Stats] Generated stats successfully', {
      totalRevenue,
      appointmentRevenue,
      labRevenue,
      totalTransactions,
      averageRevenue
    });
    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('❌ Admin dashboard stats error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

