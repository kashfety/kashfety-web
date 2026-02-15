import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { createInterface } from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

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

const FALLBACK_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Kashfety#2026';
const ROLE_SEQUENCE = ['admin', 'super_admin', 'center', 'doctor', 'patient'];
const DEFAULT_COUNTS = {
    admin: 1,
    super_admin: 1,
    center: 2,
    doctor: 2,
    patient: 3
};

function parseCliFlags() {
    const args = process.argv.slice(2);
    return {
        presetSafe: args.includes('--preset-safe'),
        yes: args.includes('--yes')
    };
}

const rl = createInterface({ input, output });

let serial = 0;
function nextSerial() {
    serial += 1;
    return `${Date.now()}${String(serial).padStart(3, '0')}`;
}

async function tableExists(table) {
    const { error } = await supabase.from(table).select('*', { head: true, count: 'exact' }).limit(1);
    return !error;
}

async function getRowCount(table) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) return { table, count: null, error: error.message };
    return { table, count: count ?? 0 };
}

async function listAllAuthUsers() {
    let page = 1;
    const perPage = 200;
    const allUsers = [];

    for (; ;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) throw new Error(`Failed listing auth users: ${error.message}`);

        const users = data?.users || [];
        allUsers.push(...users);

        if (users.length < perPage) break;
        page += 1;
    }

    return allUsers;
}

async function getAuthUserByEmail(email) {
    const allUsers = await listAllAuthUsers();
    return allUsers.find((user) => (user.email || '').toLowerCase() === email.toLowerCase()) || null;
}

async function createOrUpdateAuthUser({ email, password, role, metadata }) {
    const existing = await getAuthUserByEmail(email);

    if (existing) {
        const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
            email,
            password,
            email_confirm: true,
            user_metadata: {
                ...(existing.user_metadata || {}),
                ...(metadata || {}),
                role
            }
        });

        if (error) throw new Error(`Failed updating auth user ${email}: ${error.message}`);
        return { id: data.user.id, action: 'updated' };
    }

    const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            ...(metadata || {}),
            role
        }
    });

    if (error) throw new Error(`Failed creating auth user ${email}: ${error.message}`);
    return { id: data.user.id, action: 'created' };
}

async function promptText(message, defaultValue = '') {
    const suffix = defaultValue ? ` [${defaultValue}]` : '';
    const answer = (await rl.question(`${message}${suffix}: `)).trim();
    return answer || defaultValue;
}

async function promptYesNo(message, defaultValue = true) {
    const suffix = defaultValue ? ' [Y/n]' : ' [y/N]';

    for (; ;) {
        const answer = (await rl.question(`${message}${suffix}: `)).trim().toLowerCase();
        if (!answer) return defaultValue;
        if (answer === 'y' || answer === 'yes') return true;
        if (answer === 'n' || answer === 'no') return false;
        console.log('Please answer with y or n.');
    }
}

async function promptNumber(message, defaultValue = 1, minValue = 0) {
    for (; ;) {
        const raw = await promptText(message, String(defaultValue));
        const parsed = Number(raw);
        if (Number.isInteger(parsed) && parsed >= minValue) return parsed;
        console.log(`Please enter an integer >= ${minValue}.`);
    }
}

async function promptMultiRoles(defaultSelected = ['admin', 'super_admin']) {
    const indexMap = ROLE_SEQUENCE.reduce((acc, role, index) => {
        acc[index + 1] = role;
        return acc;
    }, {});

    console.log('\nSelect user groups to seed (comma separated):');
    ROLE_SEQUENCE.forEach((role, i) => {
        console.log(`  ${i + 1}) ${role}`);
    });

    const defaultIndexes = ROLE_SEQUENCE
        .map((role, i) => ({ role, index: i + 1 }))
        .filter((entry) => defaultSelected.includes(entry.role))
        .map((entry) => String(entry.index))
        .join(',');

    for (; ;) {
        const answer = await promptText('Groups', defaultIndexes);
        const indexes = answer
            .split(',')
            .map((chunk) => chunk.trim())
            .filter(Boolean);

        const selected = [...new Set(indexes.map((key) => indexMap[key]).filter(Boolean))];
        if (selected.length > 0) return selected;

        console.log('Select at least one valid group number.');
    }
}

async function deleteAll(table) {
    if (!(await tableExists(table))) {
        console.log(`- Skipping ${table} (table not found)`);
        return;
    }

    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) throw new Error(`Failed clearing ${table}: ${error.message}`);

    console.log(`- Cleared ${table}`);
}

async function detachCenterReferences() {
    if (await tableExists('users')) {
        const { error: usersDetachError } = await supabase
            .from('users')
            .update({ center_id: null })
            .not('center_id', 'is', null);

        if (usersDetachError) throw new Error(`Failed detaching users.center_id references: ${usersDetachError.message}`);
        console.log('- Detached users.center_id references');
    }

    if (await tableExists('centers')) {
        const { error: centersDetachError } = await supabase
            .from('centers')
            .update({ owner_doctor_id: null })
            .not('owner_doctor_id', 'is', null);

        if (centersDetachError) throw new Error(`Failed detaching centers.owner_doctor_id references: ${centersDetachError.message}`);
        console.log('- Detached centers.owner_doctor_id references');
    }
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

    if (error) throw new Error(`Failed clearing non-preserved admin_users: ${error.message}`);
    console.log('- Cleared non-preserved admin_users');
}

async function deleteUsersByRoles(preserveAdmins) {
    if (!(await tableExists('users'))) return [];

    if (preserveAdmins) {
        const { data: users, error } = await supabase.from('users').select('id, role');
        if (error) throw new Error(`Failed reading users for cleanup: ${error.message}`);

        const toDeleteIds = (users || [])
            .filter((u) => u.role !== 'admin' && u.role !== 'super_admin')
            .map((u) => u.id);

        if (!toDeleteIds.length) {
            console.log('- No non-admin users to delete');
            return (users || []).filter((u) => u.role === 'admin' || u.role === 'super_admin').map((u) => u.id);
        }

        const chunkSize = 200;
        for (let i = 0; i < toDeleteIds.length; i += chunkSize) {
            const chunk = toDeleteIds.slice(i, i + chunkSize);
            const { error: chunkError } = await supabase.from('users').delete().in('id', chunk);
            if (chunkError) throw new Error(`Failed deleting non-admin users chunk: ${chunkError.message}`);
        }

        console.log(`- Deleted ${toDeleteIds.length} non-admin users`);

        const { data: preserved, error: preservedError } = await supabase
            .from('users')
            .select('id')
            .in('role', ['admin', 'super_admin']);

        if (preservedError) throw new Error(`Failed reading preserved users: ${preservedError.message}`);
        return (preserved || []).map((u) => u.id);
    }

    await deleteAll('admin_users');
    await deleteAll('users');
    return [];
}

async function cleanupData({ preserveAdmins }) {
    console.log('\n[Cleanup] Starting wipe...');

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

    const preservedUserIds = await deleteUsersByRoles(preserveAdmins);
    if (preserveAdmins) {
        await deleteAdminUsersMap(preservedUserIds);
    }

    await deleteAll('centers');
    await deleteAll('lab_test_types');
    await deleteAll('specialties');
}

async function deleteAuthUsersNonAdmin() {
    const hasUsers = await tableExists('users');
    const adminUidSet = new Set();

    if (hasUsers) {
        const { data: adminRows, error } = await supabase
            .from('users')
            .select('uid, role')
            .in('role', ['admin', 'super_admin']);

        if (error) throw new Error(`Failed reading admin users for auth cleanup: ${error.message}`);

        for (const row of adminRows || []) {
            if (row.uid) adminUidSet.add(String(row.uid));
        }
    }

    const authUsers = await listAllAuthUsers();
    let deleted = 0;

    for (const authUser of authUsers) {
        const metadataRole = authUser.user_metadata?.role;
        const isAdminRole = metadataRole === 'admin' || metadataRole === 'super_admin';
        if (adminUidSet.has(authUser.id) || isAdminRole) {
            continue;
        }

        const { error } = await supabase.auth.admin.deleteUser(authUser.id);
        if (error) {
            console.log(`- Skipped auth delete for ${authUser.email || authUser.id}: ${error.message}`);
            continue;
        }

        deleted += 1;
    }

    console.log(`- Deleted ${deleted} non-admin auth users`);
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
        const { error } = await supabase
            .from('specialties')
            .upsert(specialties, { onConflict: 'name' });
        if (error) throw new Error(`Failed seeding specialties: ${error.message}`);
        console.log(`- Seeded ${specialties.length} specialties`);
    }

    if (!(await tableExists('lab_test_types'))) {
        console.log('- Skipped lab_test_types (table not found)');
        return { seededTestTypes: [] };
    }

    const { data: seededTestTypes, error: typeErr } = await supabase
        .from('lab_test_types')
        .upsert(labTestTypes, { onConflict: 'code' })
        .select('id, code, default_fee');

    if (typeErr) throw new Error(`Failed seeding lab_test_types: ${typeErr.message}`);
    console.log(`- Seeded ${labTestTypes.length} lab test types`);

    return { seededTestTypes: seededTestTypes || [] };
}

function buildCenterPayload(index) {
    return {
        name: `Seed Center ${index}`,
        name_ar: `مركز ${index}`,
        address: `Erbil Zone ${index}`,
        phone: `+9647501${String(index).padStart(4, '0')}`,
        email: `seed-center-${index}@kashfety.com`,
        center_type: 'generic',
        approval_status: 'approved',
        offers_labs: true,
        offers_imaging: index % 2 === 0
    };
}

async function upsertCenter(index) {
    const centerPayload = buildCenterPayload(index);

    const { data: existing, error: readErr } = await supabase
        .from('centers')
        .select('id, name, offers_labs, offers_imaging')
        .eq('email', centerPayload.email)
        .maybeSingle();

    if (readErr) throw new Error(`Failed reading center ${centerPayload.email}: ${readErr.message}`);

    if (existing) {
        const { data, error } = await supabase
            .from('centers')
            .update(centerPayload)
            .eq('id', existing.id)
            .select('id, name, offers_labs, offers_imaging')
            .single();

        if (error) throw new Error(`Failed updating center ${centerPayload.email}: ${error.message}`);
        return data;
    }

    const { data, error } = await supabase
        .from('centers')
        .insert(centerPayload)
        .select('id, name, offers_labs, offers_imaging')
        .single();

    if (error) throw new Error(`Failed creating center ${centerPayload.email}: ${error.message}`);
    return data;
}

function buildUserPayload(role, index, { uid, centerId, passwordHash }) {
    const stamp = nextSerial();
    const shared = {
        uid,
        phone: `+96477${stamp.slice(-8)}`,
        email: `seed-${role}-${stamp}-${index}@kashfety.com`,
        is_first_login: false,
        approval_status: 'approved',
        role,
        password_hash: passwordHash
    };

    if (role === 'admin' || role === 'super_admin') {
        return {
            ...shared,
            first_name: role === 'admin' ? 'Admin' : 'Super',
            last_name: `${index}`,
            name: role === 'admin' ? `Admin User ${index}` : `Super Admin ${index}`,
            default_dashboard: role === 'admin' ? 'admin-dashboard' : 'super-admin-dashboard'
        };
    }

    if (role === 'center') {
        return {
            ...shared,
            first_name: 'Center',
            last_name: `${index}`,
            name: `Center Admin ${index}`,
            default_dashboard: 'center-dashboard',
            center_id: centerId || null
        };
    }

    if (role === 'doctor') {
        const specialties = ['Cardiology', 'Pediatrics', 'Neurology', 'Radiology', 'General Medicine'];
        const specialty = specialties[(index - 1) % specialties.length];
        return {
            ...shared,
            first_name: 'Doctor',
            last_name: `${index}`,
            name: `Dr. Seed ${index}`,
            specialty,
            qualifications: ['MBChB'],
            bio: `Seeded ${specialty} doctor profile`,
            experience_years: 5 + index,
            consultation_fee: 40 + index,
            rating: 4.5,
            default_dashboard: 'doctor-dashboard'
        };
    }

    return {
        ...shared,
        first_name: 'Patient',
        last_name: `${index}`,
        name: `Patient Seed ${index}`,
        gender: index % 2 === 0 ? 'female' : 'male',
        medical_history: 'N/A',
        allergies: 'None',
        medications: 'None',
        date_of_birth: '1995-01-01',
        default_dashboard: 'patient-dashboard'
    };
}

async function upsertPublicUserByEmail(userPayload) {
    const { data: existing, error: readErr } = await supabase
        .from('users')
        .select('id, uid, role, email, center_id')
        .eq('email', userPayload.email)
        .maybeSingle();

    if (readErr) throw new Error(`Failed reading users by email (${userPayload.email}): ${readErr.message}`);

    if (existing) {
        const { data, error } = await supabase
            .from('users')
            .update(userPayload)
            .eq('id', existing.id)
            .select('id, uid, role, email, center_id')
            .single();

        if (error) throw new Error(`Failed updating user ${userPayload.email}: ${error.message}`);
        return { row: data, action: 'updated' };
    }

    const { data, error } = await supabase
        .from('users')
        .insert(userPayload)
        .select('id, uid, role, email, center_id')
        .single();

    if (error) throw new Error(`Failed inserting user ${userPayload.email}: ${error.message}`);
    return { row: data, action: 'created' };
}

async function ensureAdminUsersLinks(seedUsers) {
    if (!(await tableExists('admin_users'))) return;

    const admins = seedUsers.filter((u) => u.role === 'admin' || u.role === 'super_admin');
    let inserted = 0;

    for (const user of admins) {
        const { data: existing, error: readErr } = await supabase
            .from('admin_users')
            .select('id, user_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (readErr && !readErr.message.toLowerCase().includes('column')) {
            throw new Error(`Failed reading admin_users link for ${user.email}: ${readErr.message}`);
        }

        if (existing) continue;

        const { error } = await supabase.from('admin_users').insert({
            user_id: user.id,
            permissions: { scope: 'all', seeded: true }
        });

        if (error) {
            console.log(`- Skipped admin_users link for ${user.email}: ${error.message}`);
            continue;
        }

        inserted += 1;
    }

    console.log(`- Linked ${inserted} users in admin_users`);
}

async function tryInsertRoleLink(table, user) {
    const attempts = [
        { user_id: user.id },
        { uid: user.uid },
        { id: user.id }
    ];

    for (const payload of attempts) {
        const { error } = await supabase.from(table).insert(payload);
        if (!error) return true;

        const message = (error.message || '').toLowerCase();
        if (
            !message ||
            message.includes('column') ||
            message.includes('null value') ||
            message.includes('violates not-null') ||
            message.includes('duplicate key') ||
            message.includes('unique constraint')
        ) {
            continue;
        }

        continue;
    }

    return false;
}

async function ensureRoleTableLinks(table, users) {
    if (!(await tableExists(table))) {
        console.log(`- Skipped ${table} links (table not found)`);
        return;
    }

    let inserted = 0;
    let skipped = 0;

    for (const user of users) {
        const insertedOk = await tryInsertRoleLink(table, user);
        if (insertedOk) inserted += 1;
        else skipped += 1;
    }

    console.log(`- ${table} links inserted: ${inserted}, skipped: ${skipped}`);
}

async function fetchAllCenters() {
    if (!(await tableExists('centers'))) return [];

    const { data, error } = await supabase
        .from('centers')
        .select('id, name, offers_labs, offers_imaging')
        .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed fetching centers: ${error.message}`);
    return data || [];
}

async function seedUsersByRole({ role, count, password, centerPool }) {
    if (count <= 0) return { users: [], authStats: { created: 0, updated: 0 }, publicStats: { created: 0, updated: 0 } };

    const passwordHash = await bcrypt.hash(password, 10);
    const users = [];
    const authStats = { created: 0, updated: 0 };
    const publicStats = { created: 0, updated: 0 };

    for (let i = 1; i <= count; i += 1) {
        const center = role === 'center' ? centerPool[i - 1] : null;
        const centerId = role === 'center' ? center?.id : null;

        const provisionalEmail = `seed-${role}-${nextSerial()}-${i}@kashfety.com`;
        const authResult = await createOrUpdateAuthUser({
            email: provisionalEmail,
            password,
            role,
            metadata: {
                seed: true,
                role,
                index: i
            }
        });

        authStats[authResult.action] += 1;

        const userPayload = buildUserPayload(role, i, {
            uid: authResult.id,
            centerId,
            passwordHash
        });

        userPayload.email = provisionalEmail;

        const { row, action } = await upsertPublicUserByEmail(userPayload);
        publicStats[action] += 1;
        users.push(row);
    }

    return { users, authStats, publicStats };
}

async function seedCenterServicesAndSchedules(centers, seededTestTypes) {
    if (!centers.length || !seededTestTypes.length) return;

    if (!(await tableExists('center_lab_services')) || !(await tableExists('center_lab_schedules'))) {
        console.log('- Skipped center service/schedule seed (required tables missing)');
        return;
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

    if (!services.length) {
        console.log('- Skipped center_lab_services (no generated rows)');
        return;
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
}

async function seedDoctorCenterLinks(doctors, centers) {
    if (!doctors.length || !centers.length) return;
    if (!(await tableExists('doctor_centers'))) {
        console.log('- Skipped doctor_centers links (table not found)');
        return;
    }

    const rows = doctors.map((doctor, index) => {
        const center = centers[index % centers.length];
        return {
            doctor_id: doctor.id,
            center_id: center.id,
            is_primary: index % centers.length === 0
        };
    });

    const { error } = await supabase.from('doctor_centers').insert(rows);
    if (error) throw new Error(`Failed seeding doctor_centers: ${error.message}`);
    console.log(`- Seeded ${rows.length} doctor_centers rows`);
}

async function seedAppointmentsLabAndBilling({ doctors, patients, centers, seededTestTypes }) {
    if (!doctors.length || !patients.length || !centers.length) {
        console.log('- Skipped appointments/lab/billing (requires doctors + patients + centers)');
        return;
    }

    if (!(await tableExists('appointments')) || !(await tableExists('lab_bookings'))) {
        console.log('- Skipped appointments/lab/billing (required tables missing)');
        return;
    }

    const now = new Date();
    const datePlus = (days) => {
        const d = new Date(now);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    const appointments = [
        {
            doctor_id: doctors[0]?.id,
            patient_id: patients[0]?.id,
            center_id: centers[0]?.id,
            appointment_date: datePlus(1),
            appointment_time: '10:00',
            status: 'scheduled',
            type: 'consultation',
            consultation_fee: 45,
            notes: 'Interactive seed appointment'
        },
        {
            doctor_id: doctors[Math.min(1, doctors.length - 1)]?.id,
            patient_id: patients[Math.min(1, patients.length - 1)]?.id,
            center_id: centers[Math.min(1, centers.length - 1)]?.id,
            appointment_date: datePlus(2),
            appointment_time: '11:30',
            status: 'confirmed',
            type: 'follow_up',
            consultation_fee: 40,
            notes: 'Interactive seed follow-up appointment'
        }
    ].filter((row) => row.doctor_id && row.patient_id && row.center_id);

    const { data: insertedAppointments, error: apptErr } = await supabase
        .from('appointments')
        .insert(appointments)
        .select('id, doctor_id, patient_id');

    if (apptErr) throw new Error(`Failed seeding appointments: ${apptErr.message}`);
    console.log(`- Seeded ${appointments.length} appointments`);

    if (!seededTestTypes.length) {
        console.log('- Skipped lab_bookings (no lab_test_types available)');
        return;
    }

    const labBookings = [
        {
            patient_id: patients[0]?.id,
            center_id: centers[0]?.id,
            lab_test_type_id: seededTestTypes[0]?.id,
            booking_date: datePlus(1),
            booking_time: '09:00',
            status: 'scheduled',
            fee: seededTestTypes[0]?.default_fee || 25,
            notes: 'Interactive seed lab booking'
        }
    ].filter((row) => row.patient_id && row.center_id && row.lab_test_type_id);

    const { data: insertedLabBookings, error: labErr } = await supabase
        .from('lab_bookings')
        .insert(labBookings)
        .select('id, patient_id');

    if (labErr) throw new Error(`Failed seeding lab_bookings: ${labErr.message}`);
    console.log(`- Seeded ${labBookings.length} lab_bookings`);

    if (!(await tableExists('billing'))) return;

    const billingRows = [
        insertedAppointments?.[0]
            ? {
                appointment_id: insertedAppointments[0].id,
                doctor_id: insertedAppointments[0].doctor_id,
                patient_id: insertedAppointments[0].patient_id,
                amount: 45,
                cost: 0
            }
            : null,
        insertedLabBookings?.[0]
            ? {
                lab_booking_id: insertedLabBookings[0].id,
                patient_id: insertedLabBookings[0].patient_id,
                amount: seededTestTypes[0]?.default_fee || 25,
                cost: 0
            }
            : null
    ].filter(Boolean);

    if (!billingRows.length) return;

    const { error: billingErr } = await supabase.from('billing').insert(billingRows);
    if (billingErr) throw new Error(`Failed seeding billing: ${billingErr.message}`);
    console.log(`- Seeded ${billingRows.length} billing rows`);
}

async function printPrecheck() {
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
        'admin_users'
    ];

    console.log('\nCurrent DB snapshot:');
    const counts = await Promise.all(tablesToCount.map(getRowCount));
    counts.forEach((row) => {
        if (row.error) console.log(`- ${row.table}: unavailable (${row.error})`);
        else console.log(`- ${row.table}: ${row.count}`);
    });

    const optionalTables = ['doctors', 'patients', 'admin_users'];
    const optional = await Promise.all(optionalTables.map(async (table) => ({ table, exists: await tableExists(table) })));
    console.log('\nOptional role tables:');
    optional.forEach((row) => console.log(`- ${row.table}: ${row.exists ? 'present' : 'missing'}`));
}

async function runPostChecks(seedUsers) {
    console.log('\nPost-seed checks:');

    const uids = seedUsers.map((u) => u.uid).filter(Boolean);
    if (uids.length) {
        const { data, error } = await supabase
            .from('users')
            .select('id, uid, role, email')
            .in('uid', uids);

        if (error) throw new Error(`Failed post-check users lookup: ${error.message}`);

        console.log(`- Seeded users in public.users: ${(data || []).length}/${uids.length}`);
    }

    const orphanCenterUsersCount = await (async () => {
        const { count } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'center')
            .is('center_id', null);
        return count ?? 0;
    })();

    console.log(`- Center users missing center_id: ${orphanCenterUsersCount}`);
}

async function collectPlan() {
    console.log('Kashfety interactive seed utility');
    console.log(`Supabase project: ${SUPABASE_URL}`);

    await printPrecheck();

    const proceed = await promptYesNo('\nContinue with interactive configuration?', true);
    if (!proceed) return null;

    const wipe = await promptYesNo('Wipe existing operational data first?', false);
    let preserveAdmins = true;
    let cleanupAuthUsers = false;

    if (wipe) {
        preserveAdmins = await promptYesNo('Preserve existing admin/super_admin users?', true);
        cleanupAuthUsers = await promptYesNo('Also delete non-admin auth.users during wipe?', false);
    }

    const groups = await promptMultiRoles(['admin', 'super_admin']);

    const counts = {};
    for (const role of groups) {
        counts[role] = await promptNumber(`Count for ${role}`, DEFAULT_COUNTS[role], 0);
    }

    const seedCatalogData = await promptYesNo('Seed catalogs (specialties + lab_test_types)?', true);
    const seedCenterData = await promptYesNo('Seed center lab services/schedules?', true);
    const seedDoctorCenterData = await promptYesNo('Seed doctor-center links?', true);
    const seedRelationalData = await promptYesNo('Seed appointments/lab_bookings/billing?', false);

    const passwordInput = await promptText('Default password for newly seeded auth users', FALLBACK_PASSWORD);

    console.log('\nExecution summary:');
    console.log(`- wipe: ${wipe}`);
    if (wipe) {
        console.log(`- preserveAdmins: ${preserveAdmins}`);
        console.log(`- cleanupAuthUsers: ${cleanupAuthUsers}`);
    }
    console.log(`- groups: ${groups.join(', ')}`);
    groups.forEach((role) => console.log(`  - ${role}: ${counts[role]}`));
    console.log(`- seedCatalogData: ${seedCatalogData}`);
    console.log(`- seedCenterData: ${seedCenterData}`);
    console.log(`- seedDoctorCenterData: ${seedDoctorCenterData}`);
    console.log(`- seedRelationalData: ${seedRelationalData}`);

    const confirm = await promptText('Type SEED to execute', '');
    if (confirm !== 'SEED') {
        console.log('Cancelled. No changes applied.');
        return null;
    }

    return {
        wipe,
        preserveAdmins,
        cleanupAuthUsers,
        groups,
        counts,
        seedCatalogData,
        seedCenterData,
        seedDoctorCenterData,
        seedRelationalData,
        password: passwordInput
    };
}

async function collectPresetSafePlan() {
    console.log('Kashfety interactive seed utility (preset-safe mode)');
    console.log(`Supabase project: ${SUPABASE_URL}`);

    await printPrecheck();

    return {
        wipe: false,
        preserveAdmins: true,
        cleanupAuthUsers: false,
        groups: ['admin', 'super_admin'],
        counts: {
            admin: DEFAULT_COUNTS.admin,
            super_admin: DEFAULT_COUNTS.super_admin
        },
        seedCatalogData: true,
        seedCenterData: false,
        seedDoctorCenterData: false,
        seedRelationalData: false,
        password: FALLBACK_PASSWORD
    };
}

async function executePlan(plan) {
    if (plan.wipe) {
        await cleanupData({ preserveAdmins: plan.preserveAdmins });

        if (plan.cleanupAuthUsers) {
            await deleteAuthUsersNonAdmin();
        }
    }

    let seededTestTypes = [];
    if (plan.seedCatalogData) {
        const catalogResult = await seedCatalogs();
        seededTestTypes = catalogResult.seededTestTypes;
    }

    const seedUsers = [];
    const centersCreated = [];

    if (plan.groups.includes('center')) {
        const centerCount = plan.counts.center || 0;
        for (let i = 1; i <= centerCount; i += 1) {
            const center = await upsertCenter(i);
            centersCreated.push(center);
        }
        console.log(`- Upserted ${centersCreated.length} centers`);
    }

    const allCenters = centersCreated.length ? centersCreated : await fetchAllCenters();

    for (const role of ROLE_SEQUENCE) {
        if (!plan.groups.includes(role)) continue;

        const count = plan.counts[role] || 0;
        const centerPool = role === 'center' ? allCenters : [];

        const seeded = await seedUsersByRole({
            role,
            count,
            password: plan.password,
            centerPool
        });

        seedUsers.push(...seeded.users);
        console.log(`- ${role}: auth created=${seeded.authStats.created}, auth updated=${seeded.authStats.updated}, users created=${seeded.publicStats.created}, users updated=${seeded.publicStats.updated}`);
    }

    const doctors = seedUsers.filter((u) => u.role === 'doctor');
    const patients = seedUsers.filter((u) => u.role === 'patient');
    const centers = allCenters;

    await ensureAdminUsersLinks(seedUsers);
    await ensureRoleTableLinks('doctors', doctors);
    await ensureRoleTableLinks('patients', patients);

    if (plan.seedCenterData) {
        await seedCenterServicesAndSchedules(centers, seededTestTypes);
    }

    if (plan.seedDoctorCenterData) {
        await seedDoctorCenterLinks(doctors, centers);
    }

    if (plan.seedRelationalData) {
        await seedAppointmentsLabAndBilling({ doctors, patients, centers, seededTestTypes });
    }

    await runPostChecks(seedUsers);
    console.log('\nInteractive seed completed successfully.');
    console.log(`Seed password used: ${plan.password}`);
}

async function main() {
    const flags = parseCliFlags();

    try {
        let plan;

        if (flags.presetSafe) {
            if (!flags.yes) {
                console.error('Preset mode requires --yes to execute.');
                process.exit(1);
            }
            plan = await collectPresetSafePlan();
        } else {
            plan = await collectPlan();
        }

        if (!plan) return;

        await executePlan(plan);
    } finally {
        rl.close();
    }
}

main().catch((error) => {
    console.error('\nInteractive seed failed:', error.message || error);
    process.exit(1);
});
