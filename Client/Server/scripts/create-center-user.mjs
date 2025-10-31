import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function generateUid(role) {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { labs: false, imaging: false, seed: false };
  const positional = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--labs') opts.labs = true;
    else if (a === '--imaging') opts.imaging = true;
    else if (a === '--seed') opts.seed = true;
    else positional.push(a);
  }
  const [centerName, phone, password] = positional;
  return { centerName, phone, password, ...opts };
}

async function upsertCenter(name, offersLabs, offersImaging) {
  // Try to find by name first
  const { data: existing } = await supabase
    .from('centers')
    .select('id')
    .eq('name', name)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const { data, error } = await supabase
    .from('centers')
    .insert({ name, address: 'Auto-created center', phone: '', email: '', offers_labs: offersLabs, offers_imaging: offersImaging })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertCenterUser(centerId, phone, password, centerName) {
  // Check phone uniqueness
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();
  const password_hash = await bcrypt.hash(password, 10);
  const payload = {
    uid: generateUid('center'),
    phone,
    password_hash,
    role: 'center',
    first_name: 'Center',
    last_name: 'Admin',
    name: `${centerName} Admin`,
    center_id: centerId,
    is_first_login: false,
    default_dashboard: 'center-dashboard'
  };
  if (existing?.id) {
    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) throw error;
    return existing.id;
  }
  const { data, error } = await supabase
    .from('users')
    .insert(payload)
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function seedServicesAndSchedule(centerId) {
  // Try to attach a couple of common types if present (CBC, XRAY)
  const codes = ['CBC', 'XRAY'];
  const { data: types } = await supabase
    .from('lab_test_types')
    .select('id, code, default_fee, default_duration')
    .in('code', codes);
  if (!types || types.length === 0) {
    console.log('No lab_test_types found to seed services. Skipping.');
    return;
  }
  // Insert services
  const services = types.map(t => ({ center_id: centerId, lab_test_type_id: t.id, base_fee: t.default_fee, is_active: true }));
  {
    const { error: svcErr } = await supabase.from('center_lab_services').insert(services);
    if (svcErr) console.log('Note: center_lab_services insert skipped or failed:', svcErr.message);
  }
  // Insert a simple schedule for next: Mon-Fri 09:00, 09:30, 10:00
  const slots = [{ time: '09:00', duration: 30 }, { time: '09:30', duration: 30 }, { time: '10:00', duration: 30 }];
  for (const t of types) {
    const rows = [1,2,3,4,5].map(dow => ({ center_id: centerId, lab_test_type_id: t.id, day_of_week: dow, is_available: true, time_slots: slots, slot_duration: 30 }));
    const { error: schErr } = await supabase.from('center_lab_schedules').insert(rows);
    if (schErr) console.log('Note: center_lab_schedules insert skipped or failed:', schErr.message);
  }
}

async function main() {
  const { centerName, phone, password, labs, imaging, seed } = parseArgs();
  const name = centerName || 'Central Diagnostic Center';
  const ph = phone || '+201001112223';
  const pw = password || 'Center#12345';
  const offersLabs = labs || (!labs && !imaging); // default true if no flags
  const offersImaging = !!imaging;

  console.log('Creating center and user...');
  const centerId = await upsertCenter(name, offersLabs, offersImaging);
  const userId = await upsertCenterUser(centerId, ph, pw, name);
  if (seed) {
    await seedServicesAndSchedule(centerId);
  }
  console.log('\nCenter created:');
  console.log('  Name:', name);
  console.log('  ID:', centerId);
  console.log('\nCenter admin credentials:');
  console.log('  Phone:', ph);
  console.log('  Password:', pw);
  console.log('\nLogin at /login and you will be redirected to /center-dashboard');
}

main().catch((e) => { console.error(e); process.exit(1); });


