import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: Error | null;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: { name: string; email: string; password: string; role?: string }) => Promise<void>;
  isAuthenticated: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check if token exists in localStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
          // Verify token is valid by fetching profile
          try {
            const response = await authService.getProfile();
            const userProfile = response.data?.user || response.data || response;
            setUser(userProfile);
            setIsAuthenticated(true);
          } catch (verifyError) {
            // Token is invalid, clear it
            if (typeof window !== 'undefined') {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
            }
            setIsAuthenticated(false);
            setUser(null);
          }
        } else {
          setIsAuthenticated(false);
          setUser(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Authentication error'));
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (phone: string, password: string) => {
    setLoading(true);
    try {
      const response = await authService.login({ phone, password });
      const token = response.data?.token || response.token;
      const user = response.data?.user || response.user || response.data;
      
      // Store token and user in localStorage
      if (token && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
      }
      
      setUser(user);
      setIsAuthenticated(true);
      setError(null);
      
      // Redirect to dashboard after login
      router.push('/doctor-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Login failed'));
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Clear all auth tokens and user data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('authToken');
        document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      }
      
      setUser(null);
      setIsAuthenticated(false);
      
      // Redirect to login after logout
      router.push('/login');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Logout failed'));
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { name: string; email: string; password: string; role?: string }) => {
    setLoading(true);
    try {
      const response = await authService.register(userData);
      const token = response.data?.token || response.token;
      const user = response.data?.user || response.user || response.data;
      
      // Store token and user in localStorage
      if (token && typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
        if (user) {
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
      }
      
      setUser(user);
      setIsAuthenticated(true);
      setError(null);
      
      // Redirect to dashboard after registration
      router.push('/doctor-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Registration failed'));
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    logout,
    register,
    isAuthenticated,
  };
}
