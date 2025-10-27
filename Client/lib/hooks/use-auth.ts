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
        if (authService.isAuthenticated()) {
          setIsAuthenticated(true);
          // Fetch user profile if authenticated
          const userProfile = await authService.getProfile();
          setUser(userProfile);
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
      const { token, user } = response;
      
      authService.setAuthToken(token);
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
      await authService.logout();
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
      const { token, user } = response;
      
      authService.setAuthToken(token);
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
