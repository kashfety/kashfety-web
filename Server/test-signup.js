import axios from 'axios';

async function testSignup() {
    try {
        console.log('Testing signup endpoint...');

        const response = await axios.post('http://localhost:5000/api/users/signup', {
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password123',
            role: 'patient',
            phone: '1234567890'
        });

        console.log('✅ Signup successful:', response.data);
    } catch (error) {
        console.log('❌ Signup failed:');
        console.log('Status:', error.response?.status);
        console.log('Message:', error.response?.data?.message);
        console.log('Full error:', error.response?.data);
    }
}

testSignup(); 