import db from '../utils/supabase.js';

// Get doctor's schedule settings
export const getDoctorSchedule = async (req, res) => {
  try {
    const { doctorId } = req.params;
    
    // Get work hours
    const { data: workHours, error: workHoursError } = await db
      .from('doctor_work_hours')
      .select('*')
      .eq('doctor_id', doctorId)
      .order('day_of_week');
    
    if (workHoursError) throw workHoursError;
    
    // Get vacation periods
    const { data: vacations, error: vacationsError } = await db
      .from('doctor_vacations')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date');
    
    if (vacationsError) throw vacationsError;
    
    // Get availability overrides
    const { data: overrides, error: overridesError } = await db
      .from('doctor_availability_overrides')
      .select('*')
      .eq('doctor_id', doctorId)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date');
    
    if (overridesError) throw overridesError;
    
    res.json({
      success: true,
      data: {
        workHours,
        vacations,
        overrides
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule',
      error: error.message
    });
  }
};

// Update doctor work hours
export const updateWorkHours = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { workHours } = req.body;
    
    // Delete existing work hours
    const { error: deleteError } = await db
      .from('doctor_work_hours')
      .delete()
      .eq('doctor_id', doctorId);
    
    if (deleteError) throw deleteError;
    
    // Insert new work hours
    if (workHours && workHours.length > 0) {
      const workHoursWithDoctorId = workHours.map(wh => ({
        ...wh,
        doctor_id: doctorId
      }));
      
      const { data, error } = await db
        .from('doctor_work_hours')
        .insert(workHoursWithDoctorId)
        .select();
      
      if (error) throw error;
    }
    
    res.json({
      success: true,
      message: 'Work hours updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update work hours',
      error: error.message
    });
  }
};

// Add vacation period
export const addVacation = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { startDate, endDate, reason } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    const { data, error } = await db
      .from('doctor_vacations')
      .insert({
        doctor_id: doctorId,
        start_date: startDate,
        end_date: endDate,
        reason: reason || null
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({
      success: true,
      message: 'Vacation period added successfully',
      data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add vacation period',
      error: error.message
    });
  }
};

// Check doctor availability for a specific date/time
export const checkAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, startTime, endTime } = req.query;
    
    if (!date || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Date, start time, and end time are required'
      });
    }
    
    const dayOfWeek = new Date(date).getDay();
    
    // Check work hours
    const { data: workHours, error: workHoursError } = await db
      .from('doctor_work_hours')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .single();
    
    if (workHoursError && workHoursError.code !== 'PGRST116') throw workHoursError;
    
    // Check vacation periods
    const { data: vacations, error: vacationsError } = await db
      .from('doctor_vacations')
      .select('*')
      .eq('doctor_id', doctorId)
      .lte('start_date', date)
      .gte('end_date', date);
    
    if (vacationsError) throw vacationsError;
    
    // Check existing appointments
    const { data: appointments, error: appointmentsError } = await db
      .from('appointments')
      .select('appointment_date, appointment_time, duration')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed']);
    
    if (appointmentsError) throw appointmentsError;
    
    let isAvailable = false;
    let reason = '';
    
    // Check vacation
    if (vacations.length > 0) {
      isAvailable = false;
      reason = 'Doctor is on vacation';
    }
    // Check work hours
    else if (workHours) {
      if (workHours.is_working && 
          startTime >= workHours.start_time && 
          endTime <= workHours.end_time) {
        isAvailable = true;
      } else {
        isAvailable = false;
        reason = 'Outside of work hours';
      }
    } else {
      isAvailable = false;
      reason = 'No work hours defined for this day';
    }
    
    // Check for conflicting appointments
    if (isAvailable && appointments.length > 0) {
      for (const apt of appointments) {
        const aptStart = apt.appointment_time;
        const aptEnd = new Date(`1970-01-01T${apt.appointment_time}`);
        aptEnd.setMinutes(aptEnd.getMinutes() + (apt.duration || 30));
        const aptEndTime = aptEnd.toTimeString().slice(0, 5);
        
        if ((startTime >= aptStart && startTime < aptEndTime) ||
            (endTime > aptStart && endTime <= aptEndTime) ||
            (startTime <= aptStart && endTime >= aptEndTime)) {
          isAvailable = false;
          reason = 'Time slot conflicts with existing appointment';
          break;
        }
      }
    }
    
    res.json({
      success: true,
      data: {
        isAvailable,
        reason: isAvailable ? 'Available' : reason,
        workHours,
        hasVacation: vacations.length > 0,
        conflictingAppointments: appointments.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check availability',
      error: error.message
    });
  }
};

// Get available time slots for a date
export const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date, duration = 30 } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required'
      });
    }
    
    const dayOfWeek = new Date(date).getDay();
    
    // Get work hours for the day
    const { data: workHours, error: workHoursError } = await db
      .from('doctor_work_hours')
      .select('*')
      .eq('doctor_id', doctorId)
      .eq('day_of_week', dayOfWeek)
      .single();
    
    if (workHoursError && workHoursError.code !== 'PGRST116') throw workHoursError;
    
    if (!workHours || !workHours.is_working) {
      return res.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'Doctor is not working on this day'
        }
      });
    }
    
    // Check vacation periods
    const { data: vacations, error: vacationsError } = await db
      .from('doctor_vacations')
      .select('*')
      .eq('doctor_id', doctorId)
      .lte('start_date', date)
      .gte('end_date', date);
    
    if (vacationsError) throw vacationsError;
    
    if (vacations.length > 0) {
      return res.json({
        success: true,
        data: {
          availableSlots: [],
          message: 'Doctor is on vacation'
        }
      });
    }
    
    // Get existing appointments
    const { data: appointments, error: appointmentsError } = await db
      .from('appointments')
      .select('appointment_time, duration')
      .eq('doctor_id', doctorId)
      .eq('appointment_date', date)
      .in('status', ['scheduled', 'confirmed']);

    if (appointmentsError) throw appointmentsError;


    // Generate booked slots list for frontend compatibility
    const bookedSlots = appointments.map(apt => {
      const timeStr = apt.appointment_time;
      // Normalize time format to HH:MM
      if (timeStr.length === 8) { // HH:MM:SS format
        return timeStr.substring(0, 5); // Convert to HH:MM
      }
      return timeStr; // Already in HH:MM format
    });


    // Generate time slots
    const slots = [];
    const start = new Date(`1970-01-01T${workHours.start_time}`);
    const end = new Date(`1970-01-01T${workHours.end_time}`);
    const slotDuration = parseInt(duration);

    let current = new Date(start);
    while (current.getTime() + (slotDuration * 60000) <= end.getTime()) {
      const slotStart = current.toTimeString().slice(0, 5);
      const slotEnd = new Date(current.getTime() + (slotDuration * 60000));
      const slotEndTime = slotEnd.toTimeString().slice(0, 5);

      // Check if slot conflicts with existing appointments
      let isConflict = false;
      for (const apt of appointments) {
        const aptStart = new Date(`1970-01-01T${apt.appointment_time}`);
        const aptEnd = new Date(aptStart.getTime() + ((apt.duration || 30) * 60000));

        if ((current >= aptStart && current < aptEnd) ||
            (slotEnd > aptStart && slotEnd <= aptEnd) ||
            (current <= aptStart && slotEnd >= aptEnd)) {
          isConflict = true;
          break;
        }
      }

      if (!isConflict) {
        slots.push({
          startTime: slotStart,
          endTime: slotEndTime,
          available: true
        });
      }

      current = new Date(current.getTime() + (slotDuration * 60000));
    }

    );

    res.json({
      success: true,
      data: {
        availableSlots: slots,
        bookedSlots: bookedSlots, // ADD THIS: Frontend expects bookedSlots for filtering
        workHours,
        totalSlots: slots.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get available slots',
      error: error.message
    });
  }
}; 