import { supabaseAdmin, TABLES, dbHelpers } from "../utils/supabase.js";

// Get all medical centers
export const getAllCenters = async (req, res) => {
  try {
    const { data: centers, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: centers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch centers',
      error: error.message
    });
  }
};

// Get centers by type (pharmacy, hospital, lab)
export const getCentersByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    const { data: centers, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('*')
      .contains('services', [type])
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: centers
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch centers by type',
      error: error.message
    });
  }
};

// Get center services
export const getCenterServices = async (req, res) => {
  try {
    const { centerId } = req.params;
    
    const { data: center, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('services, name, address, phone, operating_hours')
      .eq('id', centerId)
      .single();

    if (error) throw error;

    // Define available services by category
    const serviceCategories = {
      lab: [
        'blood_test', 'urine_test', 'x_ray', 'ultrasound', 'ct_scan', 'mri', 
        'ecg', 'echo', 'stress_test', 'allergy_test', 'covid_test'
      ],
      pharmacy: [
        'prescription_drugs', 'otc_medications', 'medical_supplies', 
        'vitamins', 'first_aid', 'diabetic_supplies'
      ],
      hospital: [
        'emergency_care', 'surgery', 'inpatient_care', 'outpatient_care',
        'intensive_care', 'maternity', 'pediatric_care'
      ]
    };

    res.json({
      success: true,
      data: {
        center,
        availableServices: center.services,
        serviceCategories
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch center services',
      error: error.message
    });
  }
};

// Get nearby centers (placeholder - could be enhanced with real geolocation)
export const getNearbyCenters = async (req, res) => {
  try {
    const { lat, lng, radius = 10, type } = req.query;
    
    // For now, return all centers (could be enhanced with PostGIS for real location queries)
    let query = supabaseAdmin
      .from(TABLES.CENTERS)
      .select('*');

    if (type) {
      query = query.contains('services', [type]);
    }

    const { data: centers, error } = await query
      .order('name', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: centers,
      message: lat && lng ? 'Location-based search will be implemented with geolocation' : 'Showing all centers'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch nearby centers',
      error: error.message
    });
  }
};

// Create new center (admin only)
export const createCenter = async (req, res) => {
  try {
    const {
      name,
      address,
      phone,
      email,
      type, // pharmacy, hospital, lab
      services,
      operating_hours
    } = req.body;

    // Validate required fields
    if (!name || !address || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, and type are required'
      });
    }

    // Define default services based on type
    const defaultServices = {
      pharmacy: ['prescription_drugs', 'otc_medications', 'medical_supplies'],
      hospital: ['emergency_care', 'outpatient_care', 'inpatient_care'],
      lab: ['blood_test', 'urine_test', 'x_ray']
    };

    const centerServices = services || defaultServices[type] || [];

    const { data: center, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .insert({
        name,
        address,
        phone,
        email,
        services: centerServices,
        operating_hours: operating_hours || {
          monday: { open: '08:00', close: '18:00' },
          tuesday: { open: '08:00', close: '18:00' },
          wednesday: { open: '08:00', close: '18:00' },
          thursday: { open: '08:00', close: '18:00' },
          friday: { open: '08:00', close: '18:00' },
          saturday: { open: '09:00', close: '14:00' },
          sunday: { open: null, close: null }
        }
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Center created successfully',
      data: center
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create center',
      error: error.message
    });
  }
};

// Update center (admin only)
export const updateCenter = async (req, res) => {
  try {
    const { centerId } = req.params;
    const updateData = req.body;

    const { data: center, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .update(updateData)
      .eq('id', centerId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Center updated successfully',
      data: center
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update center',
      error: error.message
    });
  }
};

// Delete center (admin only)
export const deleteCenter = async (req, res) => {
  try {
    const { centerId } = req.params;

    const { error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .delete()
      .eq('id', centerId);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Center deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete center',
      error: error.message
    });
  }
};

// Assign doctor to center
export const assignDoctorToCenter = async (req, res) => {
  try {
    const { doctor_id, center_id, is_primary = false } = req.body;

    // Check if relationship already exists
    const { data: existing, error: checkError } = await supabaseAdmin
      .from(TABLES.DOCTOR_CENTERS)
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('center_id', center_id)
      .single();

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Doctor is already assigned to this center'
      });
    }

    // If this is primary center, unset other primary centers for this doctor
    if (is_primary) {
      await supabaseAdmin
        .from(TABLES.DOCTOR_CENTERS)
        .update({ is_primary: false })
        .eq('doctor_id', doctor_id);
    }

    const { data: assignment, error } = await supabaseAdmin
      .from(TABLES.DOCTOR_CENTERS)
      .insert({
        doctor_id,
        center_id,
        is_primary
      })
      .select(`
        *,
        doctor:doctors(id, name, specialty),
        center:centers(id, name, address)
      `)
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Doctor assigned to center successfully',
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to assign doctor to center',
      error: error.message
    });
  }
};

// Unassign doctor from center
export const unassignDoctorFromCenter = async (req, res) => {
  try {
    const { doctor_id, center_id } = req.body;

    const { error } = await supabaseAdmin
      .from(TABLES.DOCTOR_CENTERS)
      .delete()
      .eq('doctor_id', doctor_id)
      .eq('center_id', center_id);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Doctor unassigned from center successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unassign doctor from center',
      error: error.message
    });
  }
};

// Get centers where doctor works
export const getDoctorCenters = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const { data: assignments, error } = await supabaseAdmin
      .from(TABLES.DOCTOR_CENTERS)
      .select(`
        *,
        center:centers(*)
      `)
      .eq('doctor_id', doctorId)
      .order('is_primary', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: assignments.map(assignment => ({
        ...assignment.center,
        is_primary: assignment.is_primary
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor centers',
      error: error.message
    });
  }
};

// Get available time slots for center services
export const getAvailableSlots = async (req, res) => {
  try {
    const { centerId } = req.params;
    const { date, service } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    // Get center operating hours
    const { data: center, error: centerError } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('operating_hours, services')
      .eq('id', centerId)
      .single();

    if (centerError) throw centerError;

    if (service && !center.services.includes(service)) {
      return res.status(400).json({
        success: false,
        message: 'Center does not offer this service'
      });
    }

    // Get day of week
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'lowercase' });
    const operatingHours = center.operating_hours?.[dayOfWeek];

    if (!operatingHours || !operatingHours.open) {
      return res.json({
        success: true,
        data: [],
        message: 'Center is closed on this day'
      });
    }

    // Get existing appointments for this center and date
    const { data: existingAppointments, error: appointmentsError } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('appointment_time, duration')
      .eq('type', 'medical_test')
      .eq('appointment_date', date)
      .like('notes', `%Center ID: ${centerId}%`)
      .in('status', ['scheduled', 'confirmed']);

    if (appointmentsError) throw appointmentsError;

    // Generate available time slots
    const availableSlots = generateTimeSlots(operatingHours, existingAppointments);

    res.json({
      success: true,
      data: availableSlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available slots',
      error: error.message
    });
  }
};

// Add service to center
export const addCenterService = async (req, res) => {
  try {
    const { centerId } = req.params;
    const { service } = req.body;

    // Get current services
    const { data: center, error: fetchError } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('services')
      .eq('id', centerId)
      .single();

    if (fetchError) throw fetchError;

    // Add new service if not already present
    const currentServices = center.services || [];
    if (!currentServices.includes(service)) {
      currentServices.push(service);

      const { data: updatedCenter, error } = await supabaseAdmin
        .from(TABLES.CENTERS)
        .update({ services: currentServices })
        .eq('id', centerId)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Service added successfully',
        data: updatedCenter
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Service already exists'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add service',
      error: error.message
    });
  }
};

// Remove service from center
export const removeCenterService = async (req, res) => {
  try {
    const { centerId, service } = req.params;

    // Get current services
    const { data: center, error: fetchError } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('services')
      .eq('id', centerId)
      .single();

    if (fetchError) throw fetchError;

    // Remove service
    const currentServices = center.services || [];
    const updatedServices = currentServices.filter(s => s !== service);

    const { data: updatedCenter, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .update({ services: updatedServices })
      .eq('id', centerId)
      .select()
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Service removed successfully',
      data: updatedCenter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove service',
      error: error.message
    });
  }
};

// Helper function to convert time string to minutes
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to generate available time slots
const generateTimeSlots = (operatingHours, existingAppointments) => {
  const slots = [];
  const startTime = timeToMinutes(operatingHours.open);
  const endTime = timeToMinutes(operatingHours.close);
  const slotDuration = 30; // 30-minute slots

  for (let time = startTime; time < endTime; time += slotDuration) {
    const hours = Math.floor(time / 60);
    const minutes = time % 60;
    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Check if this slot conflicts with existing appointments
    const hasConflict = existingAppointments.some(appointment => {
      const appointmentStart = timeToMinutes(appointment.appointment_time);
      const appointmentEnd = appointmentStart + appointment.duration;
      return time < appointmentEnd && time + slotDuration > appointmentStart;
    });

    if (!hasConflict) {
      slots.push({
        time: timeStr,
        available: true
      });
    }
  }

  return slots;
}; 