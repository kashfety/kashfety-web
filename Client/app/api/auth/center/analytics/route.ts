import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireCenter } from '@/lib/api-auth-utils';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const FALLBACK_ENABLED = process.env.DASHBOARD_FALLBACK_ENABLED !== '0';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

export async function GET(request: NextRequest) {
  // Require center authentication even in fallback mode
  const authResult = requireCenter(request);
  if (authResult instanceof NextResponse) {
    return authResult; // Returns 401 or 403 error
  }
  const { user } = authResult;

  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  
  // Try backend first if JWT provided
  if (authHeader) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/center-dashboard/analytics`, {
        method: 'GET',
        headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (response.ok) return NextResponse.json(data);
      // fall through on non-OK
    } catch (e) {
      console.error('Backend request failed:', e);
      // fall back to supabase
    }
  }

  // Supabase fallback: requires authentication (already verified above)
  if (!FALLBACK_ENABLED) return NextResponse.json({ error: 'Backend unavailable' }, { status: 503 });
  
  try {
    const centerId = user.center_id || searchParams.get('center_id');
    if (!centerId) return NextResponse.json({ error: 'center_id is required' }, { status: 400 });
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get basic analytics for this center with patient demographics
    const { data: bookings, error } = await supabase
      .from('lab_bookings')
      .select(`
        *,
        lab_test_types:lab_test_type_id(name, category),
        patients:patient_id(gender, date_of_birth)
      `)
      .eq('center_id', centerId);

    if (error) {
      console.error('Error fetching center analytics:', error);
      return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
    }

    // Calculate analytics
    const totalBookings = bookings?.length || 0;
    const completedBookings = bookings?.filter(b => b.status === 'completed').length || 0;
    const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
    
    // Only count revenue from COMPLETED lab tests
    const totalRevenue = bookings?.filter(b => b.status === 'completed').reduce((sum, b: any) => {
      const amount = b.total_amount || b.amount || b.fee || b.price || b.cost || 0;
      return sum + (typeof amount === 'number' ? amount : 0);
    }, 0) || 0;

    // Get TODAY's scheduled appointments (not created today, but scheduled for today)
    const today = new Date().toISOString().slice(0, 10);
    const todayBookings = bookings?.filter(b => b.booking_date === today) || [];

    // Demographics calculation
    const uniquePatients = new Set<string>();
    const ageGroups: Record<string, number> = { '18-30': 0, '31-45': 0, '46-60': 0, '60+': 0 };
    const genderDistribution: Record<string, number> = { male: 0, female: 0, other: 0 };
    const testTypes: Record<string, number> = {};

    // Generate monthly trend data for the chart
    const monthlyData = [];
    for (let i = 6; i >= 0; i--) {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - i);
      const monthName = monthDate.toLocaleDateString('en-US', { month: 'short' });
      
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).toISOString().slice(0, 10);
      
      const monthBookings = (bookings || []).filter((b: any) => {
        return b.booking_date >= monthStart && b.booking_date <= monthEnd;
      });

      const monthCompleted = monthBookings.filter((b: any) => b.status === 'completed').length;
      const monthRevenue = monthBookings
        .filter((b: any) => b.status === 'completed')
        .reduce((sum: number, b: any) => {
          const amount = b.total_amount || b.amount || b.fee || b.price || b.cost || 0;
          return sum + (typeof amount === 'number' ? amount : 0);
        }, 0);
      
      monthlyData.push({
        name: monthName,
        bookings: monthBookings.length,
        completed: monthCompleted,
        revenue: monthRevenue
      });
    }

    for (const booking of bookings || []) {
      const row = booking as any;
      
      if (row.patient_id) {
        uniquePatients.add(row.patient_id);
      }

      // Test type distribution (count per booking, not per patient)
      if (row.lab_test_types?.name) {
        const testType = row.lab_test_types.name;
        testTypes[testType] = (testTypes[testType] || 0) + 1;
      }
    }

    // Calculate demographics from unique patients only
    const patientDemographics = new Map();
    
    // Collect unique patient data
    for (const booking of bookings || []) {
      const row = booking as any;
      if (row.patient_id && !patientDemographics.has(row.patient_id) && row.patients) {
        patientDemographics.set(row.patient_id, {
          gender: row.patients.gender,
          date_of_birth: row.patients.date_of_birth
        });
      }
    }

    // Calculate demographics from unique patients
    patientDemographics.forEach((patientData: any) => {
      // Gender distribution
      if (patientData.gender) {
        const gender = patientData.gender.toLowerCase();
        if (gender in genderDistribution) {
          genderDistribution[gender]++;
        } else {
          genderDistribution['other']++;
        }
      }

      // Age distribution
      if (patientData.date_of_birth) {
        const age = new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear();
        if (age >= 18 && age <= 30) ageGroups['18-30']++;
        else if (age >= 31 && age <= 45) ageGroups['31-45']++;
        else if (age >= 46 && age <= 60) ageGroups['46-60']++;
        else if (age > 60) ageGroups['60+']++;
      }
    });

    return NextResponse.json({
      success: true,
      analytics: {
        totalBookings,
        totalRevenue,
        completedBookings,
        pendingBookings,
        todayBookings: todayBookings.length,
        todayRevenue: todayBookings.filter(b => b.status === 'completed').reduce((sum, b: any) => {
          const amount = b.total_amount || b.amount || b.fee || b.price || b.cost || 0;
          return sum + (typeof amount === 'number' ? amount : 0);
        }, 0),
        totalPatients: uniquePatients.size,
        patientDemographics: {
          ageGroups,
          genderDistribution,
          testTypes,
        },
        monthlyTrend: monthlyData
      }
    });

  } catch (error: any) {
    console.error('Center analytics fallback error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch analytics' }, { status: 500 });
  }
}
