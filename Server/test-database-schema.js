import { supabaseAdmin, TABLES } from './utils/supabase.js';

async function testDatabaseSchema() {
    console.log('🧪 Testing Database Schema...\n');

    try {
        // Test 1: Check if users table exists and has uid column
        console.log('1. Checking users table schema...');
        const { data: usersData, error: usersError } = await supabaseAdmin
            .from(TABLES.USERS)
            .select('id, uid, email, name, role')
            .limit(1);

        if (usersError) {
            console.log('❌ Users table error:', usersError.message);
            if (usersError.message.includes('uid')) {
                console.log('💡 The uid column might not exist in your database.');
                console.log('💡 Please run the supabase-schema.sql script in your Supabase SQL Editor.');
            }
            return;
        }
        console.log('✅ Users table schema is correct');

        // Test 2: Check if doctors table exists
        console.log('\n2. Checking doctors table schema...');
        const { data: doctorsData, error: doctorsError } = await supabaseAdmin
            .from(TABLES.DOCTORS)
            .select('id, uid, email, name')
            .limit(1);

        if (doctorsError) {
            console.log('❌ Doctors table error:', doctorsError.message);
        } else {
            console.log('✅ Doctors table schema is correct');
        }

        // Test 3: Check if patients table exists
        console.log('\n3. Checking patients table schema...');
        const { data: patientsData, error: patientsError } = await supabaseAdmin
            .from(TABLES.PATIENTS)
            .select('id, uid, email, name')
            .limit(1);

        if (patientsError) {
            console.log('❌ Patients table error:', patientsError.message);
        } else {
            console.log('✅ Patients table schema is correct');
        }

        // Test 4: Check if appointments table exists
        console.log('\n4. Checking appointments table schema...');
        const { data: appointmentsData, error: appointmentsError } = await supabaseAdmin
            .from(TABLES.APPOINTMENTS)
            .select('id, doctor_id, patient_id')
            .limit(1);

        if (appointmentsError) {
            console.log('❌ Appointments table error:', appointmentsError.message);
        } else {
            console.log('✅ Appointments table schema is correct');
        }

        console.log('\n🎉 Database schema test completed!');
        console.log('\n📝 If you see any errors above, please:');
        console.log('1. Go to your Supabase Dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of supabase-schema.sql');
        console.log('4. Click "Run" to execute the schema');

    } catch (error) {
        console.error('❌ Database schema test failed:', error);
    }
}

// Run the test
testDatabaseSchema(); 