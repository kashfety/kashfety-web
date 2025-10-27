// Add these methods if they don't already exist in your authService

// If you need to add these methods to your existing authService:
const logout = async () => {
  try {
    // If you have a backend logout endpoint, call it here
    // const response = await api.post('/auth/logout')
    return true
  } catch (error) {
    console.error("Logout error:", error)
    throw error
  }
}

const clearAuthToken = () => {
  // Remove token from localStorage
  localStorage.removeItem('auth_token')
  
  // Additional cleanup if needed
  sessionStorage.removeItem('auth_token')
  
  // Clear any in-memory token storage if applicable
  // token = null
}

// Export these methods as part of your authService if they're not already there
// export const authService = {
//   ...existingMethods,
//   logout,
//   clearAuthToken
// }
