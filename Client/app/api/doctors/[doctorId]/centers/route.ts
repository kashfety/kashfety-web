import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

interface Center {
  id: string;
  name: string;
  address: string;
  phone?: string;
  operating_hours?: any;
  services?: any;
  center_type?: string;
}

interface DoctorCenter {
  center_id: string;
  created_at: string;
  centers: Center;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { doctorId: string } }
) {
  try {
    const { doctorId } = params;
    const { searchParams } = new URL(request.url);
    const visitType = searchParams.get('visit_type'); // 'clinic' or 'home'

    if (!doctorId) {
      return NextResponse.json({
        success: false,
        error: 'Doctor ID is required'
      }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get centers associated with this doctor
    const { data: doctorCenters, error } = await supabase
      .from('doctor_centers')
      .select(`
        center_id,
        created_at,
        centers (
          id,
          name,
          address,
          phone,
          operating_hours,
          services,
          center_type
        )
      `)
      .eq('doctor_id', doctorId);

    if (error) {
      console.error('Error fetching doctor centers:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch doctor centers'
      }, { status: 500 });
    }

    if (!doctorCenters || doctorCenters.length === 0) {
      return NextResponse.json({
        success: true,
        centers: [],
        message: 'Doctor is not associated with any centers'
      });
    }

    const typedDoctorCenters = doctorCenters as any[];
    let filteredCenters = typedDoctorCenters;

    // Filter centers based on visit type
    if (visitType === 'home') {
      // Only include home visit centers (those ending with "- Home Visit Schedule")
      filteredCenters = typedDoctorCenters.filter(dc => 
        dc.centers?.name && dc.centers.name.endsWith('- Home Visit Schedule')
      );
    } else if (visitType === 'clinic') {
      // For clinic visits, exclude home visit centers
      filteredCenters = typedDoctorCenters.filter(dc => 
        !dc.centers?.name || !dc.centers.name.endsWith('- Home Visit Schedule')
      );
    }

    // Get doctor's schedules for each center
    const centerIds = filteredCenters.map(dc => dc.center_id);
    
    let schedules: any[] = [];
    if (centerIds.length > 0) {
      const { data: scheduleData } = await supabase
        .from('doctor_schedules')
        .select('center_id, day_of_week, time_slots, consultation_fee, is_available')
        .eq('doctor_id', doctorId)
        .in('center_id', centerIds)
        .eq('is_available', true);
      
      schedules = scheduleData || [];
    }

    // Group schedules by center
    const schedulesByCenter: Record<string, any[]> = {};
    schedules.forEach(schedule => {
      if (!schedulesByCenter[schedule.center_id]) {
        schedulesByCenter[schedule.center_id] = [];
      }
      schedulesByCenter[schedule.center_id].push(schedule);
    });

    // Enhance centers with schedule information
    const enhancedCenters = filteredCenters.map(dc => ({
      id: dc.centers?.id,
      name: dc.centers?.name,
      address: dc.centers?.address,
      phone: dc.centers?.phone,
      center_type: dc.centers?.center_type,
      association_date: dc.created_at,
      schedule: schedulesByCenter[dc.center_id] || [],
      has_schedule: (schedulesByCenter[dc.center_id] || []).length > 0,
      operating_hours: typeof dc.centers?.operating_hours === 'string' 
        ? JSON.parse(dc.centers.operating_hours) 
        : dc.centers?.operating_hours,
      services: Array.isArray(dc.centers?.services) 
        ? dc.centers.services 
        : (dc.centers?.services ? JSON.parse(dc.centers.services as string) : [])
    }));

    return NextResponse.json({
      success: true,
      centers: enhancedCenters,
      total: enhancedCenters.length,
      centers_with_schedule: enhancedCenters.filter(c => c.has_schedule).length
    });

  } catch (error) {
    console.error('Error fetching doctor centers:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}