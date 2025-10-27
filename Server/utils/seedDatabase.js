import { supabaseAdmin, TABLES, authHelpers } from './supabase.js';
import bcrypt from 'bcrypt';

// Default password for all seeded users (for testing)
const DEFAULT_PASSWORD = 'password123';

// Sample patient data (will be inserted into users table with role='patient')
const patients = [
  { 
    uid: 'patient_1',
    name: 'John Doe', 
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567001',
    email: 'john.doe@example.com',
    role: 'patient',
    medical_history: 'Diabetes',
    allergies: 'Penicillin',
    medications: 'Aspirin',
    gender: 'male',
    date_of_birth: '1992-03-15'
  },
  { 
    uid: 'patient_2',
    name: 'Jane Smith', 
    first_name: 'Jane',
    last_name: 'Smith',
    phone: '+1234567002',
    email: 'jane.smith@example.com',
    role: 'patient',
    medical_history: 'Asthma',
    allergies: '',
    medications: 'Ventolin',
    gender: 'female',
    date_of_birth: '1996-07-22'
  },
  { 
    uid: 'patient_3',
    name: 'Robert Johnson', 
    first_name: 'Robert',
    last_name: 'Johnson',
    phone: '+1234567003',
    email: 'robert.johnson@example.com',
    role: 'patient',
    medical_history: '',
    allergies: '',
    medications: '',
    gender: 'male',
    date_of_birth: '1979-11-10'
  },
  { 
    uid: 'patient_4',
    name: 'Emily Davis', 
    first_name: 'Emily',
    last_name: 'Davis',
    phone: '+1234567004',
    email: 'emily.davis@example.com',
    role: 'patient',
    medical_history: '',
    allergies: 'Nuts',
    medications: '',
    gender: 'female',
    date_of_birth: '2002-01-08'
  },
  { 
    uid: 'patient_5',
    name: 'Michael Wilson', 
    first_name: 'Michael',
    last_name: 'Wilson',
    phone: '+1234567005',
    email: 'michael.wilson@example.com',
    role: 'patient',
    medical_history: 'Hypertension',
    allergies: '',
    medications: 'Lisinopril',
    gender: 'male',
    date_of_birth: '1986-05-30'
  }
];

// Sample doctor data (will be inserted into users table with role='doctor')
const doctors = [
  {
    uid: 'doctor_1',
    name: 'Dr. Ahmad Khalid',
    first_name: 'Ahmad',
    last_name: 'Khalid',
    phone: '+1234567101',
    email: 'ahmad.khalil@example.com',
    role: 'doctor',
    specialty: 'Cardiology',
    qualifications: ['MD', 'Cardiology Board Certified'],
    work_hours: {
      monday: { start: '09:00', end: '17:00' },
      wednesday: { start: '09:00', end: '17:00' },
      friday: { start: '09:00', end: '14:00' }
    },
    rating: 4.8,
    experience_years: 15,
    consultation_fee: 150.00,
    bio: 'Experienced cardiologist with 15+ years of practice specializing in heart conditions.'
  },
  {
    uid: 'doctor_2',
    name: 'Dr. Sarah Mahmoud',
    first_name: 'Sarah',
    last_name: 'Mahmoud',
    phone: '+1234567102',
    email: 'sarah.mahmoud@example.com',
    role: 'doctor',
    specialty: 'Pediatrics',
    qualifications: ['MD', 'Pediatrics Board Certified'],
    work_hours: {
      sunday: { start: '10:00', end: '18:00' },
      tuesday: { start: '10:00', end: '18:00' },
      thursday: { start: '10:00', end: '18:00' }
    },
    rating: 4.9,
    experience_years: 12,
    consultation_fee: 120.00,
    bio: 'Dedicated pediatrician focused on children\'s health and development.'
  },
  {
    uid: 'doctor_3',
    name: 'Dr. Mohammed Al-Hassan',
    email: 'mohammed.alhassan@example.com',
    role: 'doctor',
    specialty: 'Neurology',
    qualifications: ['MD', 'PhD', 'Neurology Board Certified'],
    work_hours: {
      monday: { start: '08:00', end: '16:00' },
      tuesday: { start: '08:00', end: '16:00' },
      thursday: { start: '08:00', end: '16:00' }
    },
    rating: 4.7,
    experience_years: 20,
    consultation_fee: 200.00,
    bio: 'Leading neurologist specializing in brain and nervous system disorders.'
  }
];

// Function to seed patient data in unified users table
export const seedPatients = async () => {
  try {
    console.log("Checking if patients need to be seeded...");
    
    // Check if patients already exist in users table
    const { data: existingPatients, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('role', 'patient')
      .limit(1);
    
    if (error) {
      console.error("Error checking existing patients:", error);
      return;
    }
    
    if (!existingPatients || existingPatients.length === 0) {
      console.log("Seeding patient data in users table...");
      
      // Hash password for all patients
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);
      
      // Add password hash to all patients
      const patientsWithPassword = patients.map(patient => ({
        ...patient,
        password_hash: password_hash
      }));
      
      // Insert patients directly into users table
      const { error: patientError } = await supabaseAdmin
        .from(TABLES.USERS)
        .insert(patientsWithPassword);
      
      if (patientError) {
        console.error("Error inserting patients:", patientError);
        return;
      }
      
      console.log("Patient data seeded successfully in users table!");
    } else {
      console.log("Patient data already exists. Skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding patient data:", error);
  }
};

// Function to seed doctor data in unified users table
export const seedDoctors = async () => {
  try {
    console.log("Checking if doctors need to be seeded...");
    
    // Check if doctors already exist in users table
    const { data: existingDoctors, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id')
      .eq('role', 'doctor')
      .limit(1);
    
    if (error) {
      console.error("Error checking existing doctors:", error);
      return;
    }
    
    if (!existingDoctors || existingDoctors.length === 0) {
      console.log("Seeding doctor data in users table...");
      
      // Hash password for all doctors
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(DEFAULT_PASSWORD, saltRounds);
      
      // Add password hash to all doctors
      const doctorsWithPassword = doctors.map(doctor => ({
        ...doctor,
        password_hash: password_hash
      }));
      
      // Insert doctors directly into users table
      const { error: doctorError } = await supabaseAdmin
        .from(TABLES.USERS)
        .insert(doctorsWithPassword);
      
      if (doctorError) {
        console.error("Error inserting doctors:", doctorError);
        return;
      }
      
      console.log("Doctor data seeded successfully in users table!");
    } else {
      console.log("Doctor data already exists. Skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding doctor data:", error);
  }
};

// Function to seed sample appointments
export const seedAppointments = async () => {
  try {
    console.log("Checking if appointments need to be seeded...");
    
    // Check if appointments already exist
    const { data: existingAppointments, error } = await supabaseAdmin
      .from(TABLES.APPOINTMENTS)
      .select('id')
      .limit(1);
    
    if (error) {
      console.error("Error checking existing appointments:", error);
      return;
    }
    
    if (!existingAppointments || existingAppointments.length === 0) {
      console.log("Seeding appointment data...");
      
      // Get some doctors and patients for appointments from users table
      const { data: doctorData } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('id')
        .eq('role', 'doctor')
        .limit(2);
      
      const { data: patientData } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('id')
        .eq('role', 'patient')
        .limit(3);
      
      if (doctorData && patientData && doctorData.length > 0 && patientData.length > 0) {
        const sampleAppointments = [
          {
            doctor_id: doctorData[0].id,
            patient_id: patientData[0].id,
            appointment_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Tomorrow
            appointment_time: '10:00',
            status: 'scheduled',
            type: 'consultation',
            notes: 'Regular checkup appointment'
          },
          {
            doctor_id: doctorData[1].id,
            patient_id: patientData[1].id,
            appointment_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day after tomorrow
            appointment_time: '14:30',
            status: 'confirmed',
            type: 'follow_up',
            notes: 'Follow-up appointment for previous consultation'
          }
        ];
        
        const { error: appointmentError } = await supabaseAdmin
          .from(TABLES.APPOINTMENTS)
          .insert(sampleAppointments);
        
        if (appointmentError) {
          console.error("Error inserting appointments:", appointmentError);
        } else {
          console.log("Appointment data seeded successfully!");
        }
      }
    } else {
      console.log("Appointment data already exists. Skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding appointment data:", error);
  }
};

// Function to seed medical centers
export const seedCenters = async () => {
  try {
    console.log("Checking if centers need to be seeded...");
    
    // Check if centers already exist
    const { data: existingCenters, error } = await supabaseAdmin
      .from(TABLES.CENTERS)
      .select('id')
      .limit(1);
    
    if (error) {
      console.error("Error checking existing centers:", error);
      return;
    }
    
    if (!existingCenters || existingCenters.length === 0) {
      console.log("Seeding centers data...");
      
      const centers = [
        {
          name: "City General Hospital",
          address: "123 Medical Plaza, Healthcare City, HC 12345",
          phone: "+1-555-0100",
          email: "info@citygeneralhospital.com",
          services: ["emergency_care", "surgery", "inpatient_care", "outpatient_care", "intensive_care", "maternity", "pediatric_care"],
          operating_hours: {
            monday: { open: "00:00", close: "23:59" },
            tuesday: { open: "00:00", close: "23:59" },
            wednesday: { open: "00:00", close: "23:59" },
            thursday: { open: "00:00", close: "23:59" },
            friday: { open: "00:00", close: "23:59" },
            saturday: { open: "00:00", close: "23:59" },
            sunday: { open: "00:00", close: "23:59" }
          }
        },
        {
          name: "Central Medical Lab",
          address: "456 Laboratory Ave, Medical District, MD 67890",
          phone: "+1-555-0200",
          email: "tests@centralmedlab.com",
          services: ["blood_test", "urine_test", "x_ray", "ultrasound", "ct_scan", "mri", "ecg", "echo", "stress_test", "allergy_test", "covid_test"],
          operating_hours: {
            monday: { open: "06:00", close: "20:00" },
            tuesday: { open: "06:00", close: "20:00" },
            wednesday: { open: "06:00", close: "20:00" },
            thursday: { open: "06:00", close: "20:00" },
            friday: { open: "06:00", close: "20:00" },
            saturday: { open: "08:00", close: "16:00" },
            sunday: { open: "08:00", close: "14:00" }
          }
        },
        {
          name: "Health Plus Pharmacy",
          address: "789 Pharmacy Blvd, Wellness Center, WC 13579",
          phone: "+1-555-0300",
          email: "orders@healthpluspharmacy.com",
          services: ["prescription_drugs", "otc_medications", "medical_supplies", "vitamins", "first_aid", "diabetic_supplies"],
          operating_hours: {
            monday: { open: "08:00", close: "22:00" },
            tuesday: { open: "08:00", close: "22:00" },
            wednesday: { open: "08:00", close: "22:00" },
            thursday: { open: "08:00", close: "22:00" },
            friday: { open: "08:00", close: "22:00" },
            saturday: { open: "09:00", close: "20:00" },
            sunday: { open: "10:00", close: "18:00" }
          }
        },
        {
          name: "Advanced Imaging Center",
          address: "321 Radiology Road, Imaging Complex, IC 24680",
          phone: "+1-555-0400",
          email: "scans@advancedimaging.com",
          services: ["x_ray", "ultrasound", "ct_scan", "mri", "pet_scan", "mammography", "bone_scan"],
          operating_hours: {
            monday: { open: "07:00", close: "19:00" },
            tuesday: { open: "07:00", close: "19:00" },
            wednesday: { open: "07:00", close: "19:00" },
            thursday: { open: "07:00", close: "19:00" },
            friday: { open: "07:00", close: "19:00" },
            saturday: { open: "08:00", close: "16:00" },
            sunday: { open: null, close: null }
          }
        },
        {
          name: "QuickCare Pharmacy",
          address: "654 Quick Street, Convenience Plaza, CP 97531",
          phone: "+1-555-0500",
          email: "service@quickcarepharmacy.com",
          services: ["prescription_drugs", "otc_medications", "vitamins", "first_aid", "covid_test"],
          operating_hours: {
            monday: { open: "00:00", close: "23:59" },
            tuesday: { open: "00:00", close: "23:59" },
            wednesday: { open: "00:00", close: "23:59" },
            thursday: { open: "00:00", close: "23:59" },
            friday: { open: "00:00", close: "23:59" },
            saturday: { open: "00:00", close: "23:59" },
            sunday: { open: "00:00", close: "23:59" }
          }
        }
      ];
      
      const { error: centerError } = await supabaseAdmin
        .from(TABLES.CENTERS)
        .insert(centers);
      
      if (centerError) {
        console.error("Error inserting centers:", centerError);
        return;
      }
      
      console.log("Centers data seeded successfully!");
    } else {
      console.log("Centers data already exists. Skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding centers data:", error);
  }
};

// Function to seed doctor work hours (now stored as JSONB in users table)
export const seedDoctorWorkHours = async () => {
  try {
    console.log("Checking if doctor work hours need to be seeded...");
    
    // Check if doctors have work_hours data in users table
    const { data: doctorsWithoutWorkHours, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('id, uid, work_hours')
      .eq('role', 'doctor')
      .is('work_hours', null);
    
    if (error) {
      console.error("Error checking existing work hours:", error);
      return;
    }
    
    if (doctorsWithoutWorkHours && doctorsWithoutWorkHours.length > 0) {
      console.log(`Seeding work hours for ${doctorsWithoutWorkHours.length} doctors...`);
      
      // Generate work hours for each doctor without work hours
      const workHoursUpdates = doctorsWithoutWorkHours.map(doctor => {
        const workHours = {
          monday: { start_time: '09:00', end_time: '17:00', is_available: true },
          tuesday: { start_time: '09:00', end_time: '17:00', is_available: true },
          wednesday: { start_time: '09:00', end_time: '17:00', is_available: true },
          thursday: { start_time: '09:00', end_time: '17:00', is_available: true },
          friday: { start_time: '09:00', end_time: '17:00', is_available: true },
          saturday: { start_time: '09:00', end_time: '13:00', is_available: Math.random() > 0.5 }, // Some doctors work Saturday
          sunday: { start_time: null, end_time: null, is_available: false }
        };
        
        return {
          id: doctor.id,
          work_hours: workHours
        };
      });
      
      // Update each doctor with work hours in users table
      for (const update of workHoursUpdates) {
        const { error: updateError } = await supabaseAdmin
          .from(TABLES.USERS)
          .update({ work_hours: update.work_hours })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`Error updating work hours for doctor ${update.id}:`, updateError);
        }
      }
      
      console.log("Doctor work hours seeded successfully!");
    } else {
      console.log("Doctor work hours already exist. Skipping seed.");
    }
  } catch (error) {
    console.error("Error seeding doctor work hours:", error);
  }
};

// Function to seed all database data
export const seedDatabase = async () => {
  try {
  await seedPatients();
  await seedDoctors();
    await seedCenters();
    await seedDoctorWorkHours();
    await seedAppointments();
  console.log("Database seeding completed");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
};
