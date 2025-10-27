"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/providers/auth-provider"

export default function DoctorDashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const { user, isAuthenticated, loading } = useAuth()
    const [isAuthorized, setIsAuthorized] = useState(false)

    useEffect(() => {
        // Check if user is authenticated and has correct role
        const checkAuth = async () => {
            try {
                if (!isAuthenticated) {
                    console.log("Not authenticated, redirecting to login")
                    router.push('/login')
                    return
                }

                console.log("Current user role:", user?.role)

                if (user?.role !== 'doctor') {
                    // User is authenticated but wrong role
                    console.log("Wrong role, redirecting to appropriate dashboard")
                    const dashboardPath = user?.role === 'patient' ? '/' : '/doctor-dashboard' // Redirect patients to doctor dashboard
                    router.push(dashboardPath)
                    return
                }

                setIsAuthorized(true)
            } catch (error) {
                console.error("Auth check failed:", error)
                router.push('/login')
            }
        }

        // Only run auth check when not loading
        if (!loading) {
        checkAuth()
        }
    }, [router, isAuthenticated, user, loading])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    if (!isAuthorized) {
        return null // Don't render anything if not authorized, redirect handled in useEffect
    }

    // Render children directly without any width-constraining wrapper/header
    return <>{children}</>
}
