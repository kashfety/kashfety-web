import axios from 'axios';

const testUsers = [
  {
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567001',
    email: 'john.doe@example.com',
    password: 'password123',
    role: 'patient',
    gender: 'male',
    date_of_birth: '1992-03-15'
  },
  {
    first_name: 'Dr Jane',
    last_name: 'Smith',
    phone: '+1234567002', 
    email: 'dr.jane@example.com',
    password: 'password123',
    role: 'doctor',
    specialty: 'Cardiology',
    bio: 'Experienced cardiologist',
    experience_years: 10,
    consultation_fee: 150
  },
  {
    first_name: 'Central',
    last_name: 'Medical',
    phone: '+1234567003',
    email: 'central@example.com', 
    password: 'password123',
    role: 'center',
    center_address: '123 Medical Ave, City',
    center_type: 'general',
    offers_labs: true,
    offers_imaging: true
  }
];

async function createTestUsers() {
  console.log('Creating test users with proper authentication...');
  
  for (const user of testUsers) {
    try {
      console.log(`Creating ${user.role}: ${user.first_name} ${user.last_name}`);
      
      const response = await axios.post('http://localhost:5000/api/auth/register', user);
      
      console.log(`✅ Created ${user.role}: ${response.data.user.name}`);
      console.log(`   Login with phone: ${user.phone} and password: ${user.password}`);
      
    } catch (error) {
      if (error.response?.data?.error?.includes('already registered')) {
        console.log(`⚠️  User ${user.phone} already exists`);
      } else {
        console.error(`❌ Error creating ${user.first_name}:`, error.response?.data || error.message);
      }
    }
  }
  
  console.log('\n🎉 Test user creation completed!');
  console.log('\nYou can now login with any of these credentials:');
  testUsers.forEach(user => {
    console.log(`${user.role.toUpperCase()}: phone=${user.phone}, password=${user.password}`);
  });
}

createTestUsers();
