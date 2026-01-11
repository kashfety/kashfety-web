"use client"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers/auth-provider";
import DoctorCertificateUpload from "@/components/DoctorCertificateUpload";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function UploadCertificatePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Check authentication
    if (!loading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    // Check if user is a doctor
    if (!loading && user?.role !== 'doctor') {
      router.push('/');
      return;
    }

    // Get token from localStorage
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      setToken(authToken);
    } else {
      router.push('/login');
    }
  }, [isAuthenticated, loading, user, router]);

  const handleUploadComplete = () => {
    // Redirect to doctor dashboard after successful upload
    router.push('/doctor-dashboard');
  };

  if (loading || !isAuthenticated || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Upload Medical Certificate</CardTitle>
            <CardDescription>
              Please upload your medical certificate to complete your profile verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DoctorCertificateUpload
              doctorToken={token}
              onUploadComplete={handleUploadComplete}
              showSkipOption={false}
              isModal={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

