// API endpoints for center-specific doctor scheduling
// Route: /api/centers/[centerId]/doctors/[doctorId]/schedule

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/centers/[centerId]/doctors/[doctorId]/schedule - Get center-specific schedule
export async function GET(
  request: NextRequest,
  { params }: { params: { centerId: string; doctorId: string } }
) {
  try {
    const { centerId, doctorId } = params;

    // Get doctor's schedule for specific center
    const { data: schedule, error } = await supabase
      .from('doctor_schedules')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .order('day_of_week');

    if (error) {
      console.error('Error fetching doctor schedule:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch schedule' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        schedule: schedule || [],
        doctorId,
        centerId
      }
    });

  } catch (error) {
    console.error('Error in center-specific schedule API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/centers/[centerId]/doctors/[doctorId]/schedule - Save center-specific schedule
export async function POST(
  request: NextRequest,
  { params }: { params: { centerId: string; doctorId: string } }
) {
  try {
    const { centerId, doctorId } = params;
    const body = await request.json();
    const { scheduleData } = body;

    if (!scheduleData || !Array.isArray(scheduleData)) {
      return NextResponse.json(
        { success: false, error: 'Invalid schedule data provided' },
        { status: 400 }
      );
    }

    // Verify doctor has access to this center
    const { data: doctorCenter, error: accessError } = await supabase
      .from('doctor_centers')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();

    if (accessError || !doctorCenter) {
      return NextResponse.json(
        { success: false, error: 'Doctor not associated with this center' },
        { status: 403 }
      );
    }

    // Delete existing schedule for this doctor-center combination
    await supabase
      .from('doctor_schedules')
      .delete()
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId);

    // Insert new schedule entries
    const scheduleInserts = scheduleData
      .filter(day => day.is_available)
      .map(day => ({
        doctor_id: doctorId,
        center_id: centerId,
        day_of_week: day.day_of_week,
        start_time: day.start_time,
        end_time: day.end_time,
        consultation_fee: day.consultation_fee || null,
        max_patients: day.max_patients || 10,
        is_available: true
      }));

    if (scheduleInserts.length > 0) {
      const { error: insertError } = await supabase
        .from('doctor_schedules')
        .insert(scheduleInserts);

      if (insertError) {
        console.error('Error inserting schedule:', insertError);
        return NextResponse.json(
          { success: false, error: 'Failed to save schedule' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule saved successfully',
      data: {
        doctorId,
        centerId,
        scheduleDays: scheduleInserts.length
      }
    });

  } catch (error) {
    console.error('Error saving center-specific schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/centers/[centerId]/doctors/[doctorId]/schedule - Update existing schedule
export async function PUT(
  request: NextRequest,
  { params }: { params: { centerId: string; doctorId: string } }
) {
  try {
    const { centerId, doctorId } = params;
    const body = await request.json();
    const { day_of_week, scheduleUpdate } = body;

    if (day_of_week === undefined || !scheduleUpdate) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify doctor has access to this center
    const { data: doctorCenter, error: accessError } = await supabase
      .from('doctor_centers')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('center_id', centerId)
      .single();

    if (accessError || !doctorCenter) {
      return NextResponse.json(
        { success: false, error: 'Doctor not associated with this center' },
        { status: 403 }
      );
    }

    if (scheduleUpdate.is_available) {
      // Update or insert schedule
      const { error } = await supabase
        .from('doctor_schedules')
        .upsert({
          doctor_id: doctorId,
          center_id: centerId,
          day_of_week,
          start_time: scheduleUpdate.start_time,
          end_time: scheduleUpdate.end_time,
          consultation_fee: scheduleUpdate.consultation_fee || null,
          max_patients: scheduleUpdate.max_patients || 10,
          is_available: true
        });

      if (error) {
        console.error('Error updating schedule:', error);
        return NextResponse.json(
          { success: false, error: 'Failed to update schedule' },
          { status: 500 }
        );
      }
    } else {
      // Remove schedule for this day
      await supabase
        .from('doctor_schedules')
        .delete()
        .eq('doctor_id', doctorId)
        .eq('center_id', centerId)
        .eq('day_of_week', day_of_week);
    }

    return NextResponse.json({
      success: true,
      message: 'Schedule updated successfully'
    });

  } catch (error) {
    console.error('Error updating center-specific schedule:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
