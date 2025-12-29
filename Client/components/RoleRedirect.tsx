"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/providers/auth-provider"

export default function RoleRedirect() {
    const router = useRouter()
    const pathname = usePathname()
    const { user, isAuthenticated, loading } = useAuth()

    useEffect(() => {
        if (loading || !isAuthenticated || !user) return

        const role = user.role.toLowerCase()
        const currentPath = pathname

        // Define role-based paths
        const rolePaths = {
            super_admin: '/super-admin-dashboard',
            admin: '/admin-dashboard',
            doctor: '/dashboard',
            patient: '/patient'
        }

        const expectedPath = rolePaths[role as keyof typeof rolePaths] || '/patient'

        // If user is on a path that doesn't match their role, redirect them
        if (!currentPath.startsWith(expectedPath) &&
            !currentPath.startsWith('/login') &&
            !currentPath.startsWith('/signup') &&
            currentPath !== '/') {

             redirected from ${currentPath} to ${expectedPath}`)
            router.replace(expectedPath)
        }
    }, [user, isAuthenticated, loading, pathname, router])

    return null // This component doesn't render anything
} 