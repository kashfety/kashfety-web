"use client"

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Clear any old localStorage entries that might cause redirects
    if (typeof window !== 'undefined') {
      const defaultDashboard = localStorage.getItem('defaultDashboard');
      if (defaultDashboard === '/patient-dashboard') {
        localStorage.setItem('defaultDashboard', '/');
      }
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="mb-6">
          <h1 className="text-6xl font-bold text-gray-800 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-gray-600 mb-4">Page Not Found</h2>
          <p className="text-gray-500 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={() => router.push('/')} 
            className="w-full bg-[#4DBCC4] hover:bg-[#4DBCC4]/90 dark:bg-[#2a5f6b] dark:hover:bg-[#2a5f6b]/90"
          >
            Go to Home
          </Button>
          <Button 
            onClick={() => router.push('/doctor-dashboard')} 
            variant="outline"
            className="w-full border-[#4DBCC4] text-[#4DBCC4] hover:bg-[#4DBCC4] hover:text-white dark:border-[#4DBCC4] dark:text-[#4DBCC4] dark:hover:bg-[#4DBCC4]"
          >
            Doctor Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
