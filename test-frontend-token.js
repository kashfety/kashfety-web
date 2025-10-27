// Test script to decode and verify the frontend token
// Run this in the browser console

function decodeJWT(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) {
            return { error: 'Invalid JWT format' };
        }
        
        const payload = JSON.parse(atob(parts[1]));
        return payload;
    } catch (error) {
        return { error: 'Failed to decode token', details: error.message };
    }
}

console.log('=== FRONTEND TOKEN ANALYSIS ===');

const token = localStorage.getItem('auth_token');
console.log('Token exists:', !!token);

if (token) {
    console.log('Token length:', token.length);
    console.log('Token preview:', token.substring(0, 50) + '...');
    
    const decoded = decodeJWT(token);
    console.log('Decoded token:', decoded);
    
    if (decoded.exp) {
        const expiry = new Date(decoded.exp * 1000);
        const now = new Date();
        console.log('Token expires:', expiry.toISOString());
        console.log('Token expired?', expiry < now);
    }
    
    console.log('User role:', decoded.role);
    console.log('User ID:', decoded.userId);
} else {
    console.log('No auth token found in localStorage');
}

// Test the actual API call
async function testAPI() {
    console.log('\n=== TESTING API DIRECTLY ===');
    
    try {
        const response = await fetch('/api/admin/center-requests?status=pending', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('API Response status:', response.status);
        console.log('API Response headers:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('API Response data:', data);
        
    } catch (error) {
        console.error('API Test error:', error);
    }
}

if (token) {
    testAPI();
}