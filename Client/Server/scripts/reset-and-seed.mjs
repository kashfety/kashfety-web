import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from common locations
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Client/Server/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Client/.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'Client/.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Kashfety#2026';

function parseArgs() {
    const args = process.argv.slice(2);
    const flags = {
        precheck: args.includes('--precheck') || !args.includes('--execute'),
        execute: args.includes('--execute'),
        yes: args.includes('--yes')
    };
    return flags;
}

function randomUid(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function getRowCount(table) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) return { table, count: null, error: error.message };
    return { table, count: count ?? 0 };
}

async function tableExists(table) {
    const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    return !error;
}

async function deleteAll(table) {
    if (!(await tableExists(table))) {
        console.log(`- Skipping ${table} (table not found)`);
        return;
    }

    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) {
        throw new Error(`Failed clearing ${table}: ${error.message}`);
    }
    console.log(`- Cleared ${table}`);
}

async function deleteAdminUsersMap(preservedUserIds) {
    if (!(await tableExists('admin_users'))) return;

    if (!preservedUserIds.length) {
        await deleteAll('admin_users');
        return;
    }

    const quotedIds = preservedUserIds.map((id) => `"${id}"`).join(',');

    const { error } = await supabase
        .from('admin_users')
        .delete()
        .not('user_id', 'in', `(${quotedIds})`);

    if (error) {
        throw new Error(`Failed clearing non-preserved admin_users: ${error.message}`);
    }

    console.log('- Cleared non-preserved admin_users');
}

async function deleteNonAdminUsers() {
    if (!(await tableExists('users'))) return;

    const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, role');

    if (usersError) {
        throw new Error(`Failed reading users for cleanup: ${usersError.message}`);
    }

    const toDeleteIds = (users || [])
        .filter((u) => u.role !== 'admin' && u.role !== 'super_admin')
        .map((u) => u.id);

    if (!toDeleteIds.length) {
        console.log('- No non-admin users to delete');
        return;
    }

    // Chunk delete to avoid payload limits
    const chunkSize = 200;
    for (let i = 0; i < toDeleteIds.length; i += chunkSize) {
        const chunk = toDeleteIds.slice(i, i + chunkSize);
        const { error } = await supabase.from('users').delete().in('id', chunk);
        if (error) {
            throw new Error(`Failed deleting non-admin users chunk: ${error.message}`);
        }
    }

    console.log(`- Deleted ${toDeleteIds.length} non-admin users`);
}

async function detachCenterReferences() {
    if (await tableExists('users')) {
        const { error: usersDetachError } = await supabase
            .from('users')
            .update({ center_id: null })
            .not('center_id', 'is', null);

        if (usersDetachError) {
            throw new Error(`Failed detaching users.center_id references: ${usersDetachError.message}`);
        }

        console.log('- Detached users.center_id references');
    }

    if (await tableExists('centers')) {
        const { error: centersDetachError } = await supabase
            .from('centers')
            .update({ owner_doctor_id: null })
            .not('owner_doctor_id', 'is', null);

        if (centersDetachError) {
            throw new Error(`Failed detaching centers.owner_doctor_id references: ${centersDetachError.message}`);
        }

        console.log('- Detached centers.owner_doctor_id references');
    }
}

async function cleanupData(preservedUserIds) {
    console.log('\n[1/3] Cleaning data (preserving admin/super_admin users)...');

    await detachCenterReferences();

    const deleteOrderAll = [
        'billing',
        'appointment_reasons',
        'lab_bookings',
        'appointments',
        'medical_records',
        'procedures',
        'doctor_reviews',
        'reviews',
        'doctor_schedules',
        'doctor_availability',
        'doctor_centers',
        'doctor_certificates',
        'center_lab_schedules',
        'center_lab_services',
        'banners',
        'otp_verifications',
        'notification',
        'audit_logs'
    ];

    for (const table of deleteOrderAll) {
        await deleteAll(table);
    }

    await deleteAdminUsersMap(preservedUserIds);
    await deleteNonAdminUsers();

    // Delete all centers and catalog data before re-seeding
    await deleteAll('centers');
    await deleteAll('lab_test_types');
    await deleteAll('specialties');
}

async function seedCatalogs() {
    const specialties = [
        { name: 'Cardiology', name_en: 'Cardiology', name_ar: 'أمراض القلب', name_ku: 'نەخۆشیی دڵ', is_active: true, display_order: 1 },
        { name: 'Pediatrics', name_en: 'Pediatrics', name_ar: 'طب الأطفال', name_ku: 'پزیشکی منداڵان', is_active: true, display_order: 2 },
        { name: 'Neurology', name_en: 'Neurology', name_ar: 'طب الأعصاب', name_ku: 'دەماری', is_active: true, display_order: 3 },
        { name: 'Radiology', name_en: 'Radiology', name_ar: 'الأشعة', name_ku: 'ڕادیۆلۆجی', is_active: true, display_order: 4 },
        { name: 'General Medicine', name_en: 'General Medicine', name_ar: 'طب عام', name_ku: 'پزیشکی گشتی', is_active: true, display_order: 5 }
    ];

    const labTestTypes = [
        { code: 'CBC', name: 'Complete Blood Count', name_en: 'Complete Blood Count', name_ar: 'تعداد الدم الكامل', name_ku: 'ژماردنی تەواوی خوێن', category: 'lab', default_duration: 20, default_fee: 25, is_active: true, display_order: 1 },
        { code: 'BMP', name: 'Basic Metabolic Panel', name_en: 'Basic Metabolic Panel', name_ar: 'لوحة الأيض الأساسية', name_ku: 'پانێلی بنەڕەتی گۆڕانکاری', category: 'lab', default_duration: 20, default_fee: 30, is_active: true, display_order: 2 },
        { code: 'LIPID', name: 'Lipid Profile', name_en: 'Lipid Profile', name_ar: 'تحليل الدهون', name_ku: 'پڕۆفایلی چەوری', category: 'lab', default_duration: 20, default_fee: 28, is_active: true, display_order: 3 },
        { code: 'HBA1C', name: 'HbA1c', name_en: 'HbA1c', name_ar: 'السكر التراكمي', name_ku: 'شەکری کۆکراو', category: 'lab', default_duration: 15, default_fee: 22, is_active: true, display_order: 4 },
        { code: 'TSH', name: 'Thyroid Stimulating Hormone', name_en: 'Thyroid Stimulating Hormone', name_ar: 'هرمون الغدة الدرقية', name_ku: 'هۆرمۆنی تیروید', category: 'lab', default_duration: 20, default_fee: 24, is_active: true, display_order: 5 },
        { code: 'XRAYCHEST', name: 'Chest X-Ray', name_en: 'Chest X-Ray', name_ar: 'أشعة الصدر', name_ku: 'ئەشعەی سنگ', category: 'imaging', default_duration: 25, default_fee: 35, is_active: true, display_order: 6 },
        { code: 'USABD', name: 'Abdominal Ultrasound', name_en: 'Abdominal Ultrasound', name_ar: 'سونار البطن', name_ku: 'سۆناری سک', category: 'imaging', default_duration: 30, default_fee: 45, is_active: true, display_order: 7 },
        { code: 'CTHEAD', name: 'Head CT Scan', name_en: 'Head CT Scan', name_ar: 'طبقي للرأس', name_ku: 'سی تی سکان بۆ سەر', category: 'imaging', default_duration: 40, default_fee: 85, is_active: true, display_order: 8 }
    ];

    if (await tableExists('specialties')) {
        const { error } = await supabase.from('specialties').insert(specialties);
        if (error) throw new Error(`Failed seeding specialties: ${error.message}`);
        console.log(`- Seeded ${specialties.length} specialties`);
    }

    const { data: seededTestTypes, error: testTypeErr } = await supabase
        .from('lab_test_types')
        .insert(labTestTypes)
        .select('id, code, default_fee');

    if (testTypeErr) throw new Error(`Failed seeding lab_test_types: ${testTypeErr.message}`);
    console.log(`- Seeded ${labTestTypes.length} lab test types`);

    return { seededTestTypes: seededTestTypes || [] };
}

async function seedCentersAndUsers() {
    const centers = [
        {
            name: 'Kashfety Diagnostic Center',
            name_ar: 'مركز كشفتي التشخيصي',
            address: 'Ainkawa, Erbil',
            phone: '+9647500001001',
            email: 'center1@kashfety.com',
            center_type: 'generic',
            approval_status: 'approved',
            offers_labs: true,
            offers_imaging: true
        },
        {
            name: 'Razi Medical Lab',
            name_ar: 'مختبر الرازي الطبي',
            address: '60 Meter Road, Erbil',
            phone: '+9647500001002',
            email: 'center2@kashfety.com',
            center_type: 'generic',
            approval_status: 'approved',
            offers_labs: true,
            offers_imaging: false
        }
    ];

    const { data: insertedCenters, error: centersError } = await supabase
        .from('centers')
        .insert(centers)
        .select('id, name, offers_labs, offers_imaging');

    if (centersError) throw new Error(`Failed seeding centers: ${centersError.message}`);

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const centerUsers = (insertedCenters || []).map((center, idx) => ({
        uid: randomUid('center'),
        phone: `+96475000020${idx + 1}`,
        first_name: center.name.split(' ')[0],
        last_name: 'Admin',
        name: `${center.name} Admin`,
        email: `center-admin-${idx + 1}@kashfety.com`,
        role: 'center',
        password_hash: passwordHash,
        is_first_login: false,
        default_dashboard: 'center-dashboard',
        approval_status: 'approved',
        center_id: center.id
    }));

    const doctors = [
        {
            uid: randomUid('doctor'),
            phone: '+9647500003001',
            first_name: 'Ahmad',
            last_name: 'Karim',
            name: 'Dr. Ahmad Karim',
            email: 'doctor1@kashfety.com',
            role: 'doctor',
            password_hash: passwordHash,
            specialty: 'Cardiology',
            qualifications: ['MBChB', 'Board Certified Cardiology'],
            bio: 'Cardiologist focused on preventive and interventional care.',
            experience_years: 12,
            consultation_fee: 45,
            rating: 4.7,
            approval_status: 'approved',
            is_first_login: false,
            default_dashboard: 'doctor-dashboard',
            work_hours: {
                monday: { start_time: '09:00', end_time: '17:00', is_available: true },
                tuesday: { start_time: '09:00', end_time: '17:00', is_available: true },
                wednesday: { start_time: '09:00', end_time: '17:00', is_available: true },
                thursday: { start_time: '09:00', end_time: '17:00', is_available: true },
                friday: { start_time: '09:00', end_time: '14:00', is_available: true }
            }
        },
        {
            uid: randomUid('doctor'),
            phone: '+9647500003002',
            first_name: 'Sara',
            last_name: 'Nour',
            name: 'Dr. Sara Nour',
            email: 'doctor2@kashfety.com',
            role: 'doctor',
            password_hash: passwordHash,
            specialty: 'Pediatrics',
            qualifications: ['MBChB', 'Pediatrics Diploma'],
            bio: 'Pediatric specialist with focus on primary child health.',
            experience_years: 9,
            consultation_fee: 40,
            rating: 4.8,
            approval_status: 'approved',
            is_first_login: false,
            default_dashboard: 'doctor-dashboard',
            work_hours: {
                sunday: { start_time: '10:00', end_time: '18:00', is_available: true },
                monday: { start_time: '10:00', end_time: '18:00', is_available: true },
                wednesday: { start_time: '10:00', end_time: '18:00', is_available: true },
                thursday: { start_time: '10:00', end_time: '18:00', is_available: true }
            }
        }
    ];

    const patients = [
        {
            uid: randomUid('patient'),
            phone: '+9647500004001',
            first_name: 'Zana',
            last_name: 'Ali',
            name: 'Zana Ali',
            email: 'patient1@kashfety.com',
            role: 'patient',
            password_hash: passwordHash,
            gender: 'male',
            date_of_birth: '1994-04-15',
            medical_history: 'Hypertension',
            allergies: 'Penicillin',
            medications: 'Amlodipine',
            is_first_login: false,
            default_dashboard: 'patient-dashboard',
            approval_status: 'approved'
        },
        {
            uid: randomUid('patient'),
            phone: '+9647500004002',
            first_name: 'Ranya',
            last_name: 'Hassan',
            name: 'Ranya Hassan',
            email: 'patient2@kashfety.com',
            role: 'patient',
            password_hash: passwordHash,
            gender: 'female',
            date_of_birth: '2000-09-28',
            medical_history: 'Asthma',
            allergies: 'None',
            medications: 'Inhaler',
            is_first_login: false,
            default_dashboard: 'patient-dashboard',
            approval_status: 'approved'
        },
        {
            uid: randomUid('patient'),
            phone: '+9647500004003',
            first_name: 'Dilan',
            last_name: 'Omar',
            name: 'Dilan Omar',
            email: 'patient3@kashfety.com',
            role: 'patient',
            password_hash: passwordHash,
            gender: 'female',
            date_of_birth: '1988-01-10',
            medical_history: 'Diabetes Type 2',
            allergies: 'Sulfa',
            medications: 'Metformin',
            is_first_login: false,
            default_dashboard: 'patient-dashboard',
            approval_status: 'approved'
        }
    ];

    const [{ data: insertedCenterUsers, error: centerUsersErr }, { data: insertedDoctors, error: doctorsErr }, { data: insertedPatients, error: patientsErr }] = await Promise.all([
        supabase.from('users').insert(centerUsers).select('id, center_id, name, role'),
        supabase.from('users').insert(doctors).select('id, name, role'),
        supabase.from('users').insert(patients).select('id, name, role')
    ]);

    if (centerUsersErr) throw new Error(`Failed seeding center users: ${centerUsersErr.message}`);
    if (doctorsErr) throw new Error(`Failed seeding doctor users: ${doctorsErr.message}`);
    if (patientsErr) throw new Error(`Failed seeding patient users: ${patientsErr.message}`);

    console.log(`- Seeded ${(insertedCenterUsers || []).length} center users`);
    console.log(`- Seeded ${(insertedDoctors || []).length} doctor users`);
    console.log(`- Seeded ${(insertedPatients || []).length} patient users`);

    return {
        centers: insertedCenters || [],
        centerUsers: insertedCenterUsers || [],
        doctors: insertedDoctors || [],
        patients: insertedPatients || []
    };
}

async function seedRelations(seedState) {
    const { centers, doctors, patients, seededTestTypes } = seedState;

    if (!centers.length || !doctors.length || !patients.length || !seededTestTypes.length) {
        throw new Error('Missing seed entities needed for relational seed');
    }

    const doctorCenters = [
        { doctor_id: doctors[0].id, center_id: centers[0].id, is_primary: true },
        { doctor_id: doctors[1].id, center_id: centers[0].id, is_primary: false },
        { doctor_id: doctors[1].id, center_id: centers[1].id, is_primary: true }
    ];

    if (await tableExists('doctor_centers')) {
        const { error: dcErr } = await supabase.from('doctor_centers').insert(doctorCenters);
        if (dcErr) throw new Error(`Failed seeding doctor_centers: ${dcErr.message}`);
        console.log(`- Seeded ${doctorCenters.length} doctor_centers rows`);
    }

    const services = [];
    for (const center of centers) {
        for (const type of seededTestTypes) {
            const isImaging = ['XRAYCHEST', 'USABD', 'CTHEAD'].includes(type.code);
            if (isImaging && !center.offers_imaging) continue;

            services.push({
                center_id: center.id,
                lab_test_type_id: type.id,
                base_fee: type.default_fee,
                is_active: true,
                display_order: 0
            });
        }
    }

    const { error: serviceErr } = await supabase.from('center_lab_services').insert(services);
    if (serviceErr) throw new Error(`Failed seeding center_lab_services: ${serviceErr.message}`);
    console.log(`- Seeded ${services.length} center_lab_services rows`);

    const schedules = [];
    const defaultSlots = [
        { time: '09:00', duration: 30 },
        { time: '09:30', duration: 30 },
        { time: '10:00', duration: 30 },
        { time: '10:30', duration: 30 }
    ];

    for (const svc of services) {
        for (const day of [0, 1, 2, 3, 4]) {
            schedules.push({
                center_id: svc.center_id,
                lab_test_type_id: svc.lab_test_type_id,
                day_of_week: day,
                is_available: true,
                time_slots: defaultSlots,
                slot_duration: 30,
                break_start: '12:00',
                break_end: '13:00'
            });
        }
    }

    const { error: scheduleErr } = await supabase.from('center_lab_schedules').insert(schedules);
    if (scheduleErr) throw new Error(`Failed seeding center_lab_schedules: ${scheduleErr.message}`);
    console.log(`- Seeded ${schedules.length} center_lab_schedules rows`);

    const now = new Date();
    const datePlus = (days) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    const appointments = [
        {
            doctor_id: doctors[0].id,
            patient_id: patients[0].id,
            center_id: centers[0].id,
            appointment_date: datePlus(1),
            appointment_time: '10:00',
            status: 'scheduled',
            type: 'consultation',
            consultation_fee: 45,
            notes: 'Seeded consultation appointment'
        },
        {
            doctor_id: doctors[1].id,
            patient_id: patients[1].id,
            center_id: centers[1].id,
            appointment_date: datePlus(2),
            appointment_time: '11:30',
            status: 'confirmed',
            type: 'follow_up',
            consultation_fee: 40,
            notes: 'Seeded follow-up appointment'
        }
    ];

    const { data: insertedAppointments, error: apptErr } = await supabase
        .from('appointments')
        .insert(appointments)
        .select('id, doctor_id, patient_id');

    if (apptErr) throw new Error(`Failed seeding appointments: ${apptErr.message}`);
    console.log(`- Seeded ${appointments.length} appointments`);

    const labBookings = [
        {
            patient_id: patients[0].id,
            center_id: centers[0].id,
            lab_test_type_id: seededTestTypes[0].id,
            booking_date: datePlus(1),
            booking_time: '09:00',
            status: 'scheduled',
            fee: seededTestTypes[0].default_fee,
            notes: 'Seeded lab booking'
        },
        {
            patient_id: patients[2].id,
            center_id: centers[1].id,
            lab_test_type_id: seededTestTypes[1].id,
            booking_date: datePlus(3),
            booking_time: '10:30',
            status: 'confirmed',
            fee: seededTestTypes[1].default_fee,
            notes: 'Seeded lab booking'
        }
    ];

    const { data: insertedLabBookings, error: labErr } = await supabase
        .from('lab_bookings')
        .insert(labBookings)
        .select('id, patient_id, center_id');

    if (labErr) throw new Error(`Failed seeding lab_bookings: ${labErr.message}`);
    console.log(`- Seeded ${labBookings.length} lab_bookings`);

    if (await tableExists('billing')) {
        const billingRows = [
            {
                appointment_id: insertedAppointments?.[0]?.id,
                doctor_id: insertedAppointments?.[0]?.doctor_id,
                patient_id: insertedAppointments?.[0]?.patient_id,
                amount: 45,
                cost: 0
            },
            {
                lab_booking_id: insertedLabBookings?.[0]?.id,
                patient_id: insertedLabBookings?.[0]?.patient_id,
                amount: seededTestTypes[0].default_fee,
                cost: 0
            }
        ].filter(Boolean);

        if (billingRows.length) {
            const { error: billingErr } = await supabase.from('billing').insert(billingRows);
            if (billingErr) throw new Error(`Failed seeding billing: ${billingErr.message}`);
            console.log(`- Seeded ${billingRows.length} billing rows`);
        }
    }
}

async function precheckReport() {
    console.log('Generating precheck report...\n');

    const tablesToCount = [
        'users',
        'centers',
        'lab_test_types',
        'center_lab_services',
        'center_lab_schedules',
        'appointments',
        'lab_bookings',
        'billing',
        'doctor_centers',
        'doctor_schedules',
        'doctor_availability'
    ];

    const counts = await Promise.all(tablesToCount.map(getRowCount));
    counts.forEach((row) => {
        if (row.error) {
            console.log(`- ${row.table}: unavailable (${row.error})`);
        } else {
            console.log(`- ${row.table}: ${row.count}`);
        }
    });

    const { data: roleRows, error: roleErr } = await supabase
        .from('users')
        .select('role');

    if (!roleErr) {
        const roleSummary = (roleRows || []).reduce((acc, item) => {
            acc[item.role] = (acc[item.role] || 0) + 1;
            return acc;
        }, {});
        console.log('\nUser role distribution:');
        Object.entries(roleSummary).forEach(([role, count]) => {
            console.log(`- ${role}: ${count}`);
        });
    }

    console.log('\nDestructive execution requires: --execute --yes');
}

async function runIntegrityChecks() {
    console.log('\n[3/3] Running post-seed integrity checks...');

    const checks = [];

    const { count: orphanCenterUsersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'center')
        .is('center_id', null);
    checks.push({ name: 'Center users missing center_id', count: orphanCenterUsersCount ?? 0 });

    const { count: activeServicesCount } = await supabase
        .from('center_lab_services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);
    checks.push({ name: 'Active center_lab_services', count: activeServicesCount ?? 0 });

    const { count: scheduleCount } = await supabase
        .from('center_lab_schedules')
        .select('*', { count: 'exact', head: true });
    checks.push({ name: 'center_lab_schedules', count: scheduleCount ?? 0 });

    const { count: bookingCount } = await supabase
        .from('lab_bookings')
        .select('*', { count: 'exact', head: true });
    checks.push({ name: 'lab_bookings', count: bookingCount ?? 0 });

    checks.forEach((c) => console.log(`- ${c.name}: ${c.count}`));
}

async function main() {
    const args = parseArgs();

    console.log('Kashfety reset-and-seed utility');
    console.log(`Supabase project: ${SUPABASE_URL}`);

    await precheckReport();

    if (!args.execute) {
        console.log('\nPrecheck only completed. Re-run with --execute --yes to apply cleanup + seed.');
        return;
    }

    if (!args.yes) {
        console.error('\nRefusing destructive run without --yes flag.');
        process.exit(1);
    }

    console.log('\nExecuting destructive reset + seed...');

    const { data: preservedUsers, error: preserveErr } = await supabase
        .from('users')
        .select('id, role, email')
        .in('role', ['admin', 'super_admin']);

    if (preserveErr) {
        throw new Error(`Failed reading admin/super_admin users: ${preserveErr.message}`);
    }

    const preservedUserIds = (preservedUsers || []).map((u) => u.id);
    console.log(`Preserving ${(preservedUsers || []).length} admin/super_admin users.`);

    await cleanupData(preservedUserIds);

    console.log('\n[2/3] Seeding fresh data...');
    const { seededTestTypes } = await seedCatalogs();
    const seededUsers = await seedCentersAndUsers();
    await seedRelations({ ...seededUsers, seededTestTypes });

    await runIntegrityChecks();

    console.log('\nCompleted reset + seed successfully.');
    console.log(`Default seeded password: ${DEFAULT_PASSWORD}`);
}

main().catch((error) => {
    console.error('\nSeed run failed:', error.message || error);
    process.exit(1);
});
