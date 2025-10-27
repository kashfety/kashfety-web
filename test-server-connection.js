// Simple test to check if the server is running and accessible
const testServerConnection = async () => {
    try {
        console.log('Testing server connection...');

        // Test basic server endpoint
        const response = await fetch('http://localhost:5000/');
        const data = await response.json();
        console.log('✅ Server is running');
        console.log('Server response:', data);

        // Test registration endpoint with minimal data
        const testData = {
            phone: '1234567890',
            password: 'testpassword',
            role: 'patient',
            first_name: 'Test',
            last_name: 'User'
        };

        console.log('\nTesting registration endpoint...');
        console.log('Sending data:', testData);

        const regResponse = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const regData = await regResponse.json();
        console.log('Registration response status:', regResponse.status);
        console.log('Registration response:', regData);

    } catch (error) {
        console.error('❌ Server connection failed:', error.message);
        console.log('\nPossible issues:');
        console.log('1. Server is not running - run "npm run dev" in the Server directory');
        console.log('2. Missing environment variables - check Server/.env file');
        console.log('3. Port 5000 is blocked or in use');
    }
};

testServerConnection();
