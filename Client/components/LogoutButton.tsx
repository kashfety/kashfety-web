"use client"

import { useRouter } from "next/navigation"
import { authService } from "@/lib/api"

interface LogoutButtonProps {
    className?: string
    onClick?: () => void
    variant?: 'default' | 'outline'
    children?: React.ReactNode
}

export default function LogoutButton({ className = "", onClick, variant = 'default', children }: LogoutButtonProps) {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            // Call logout endpoint if you have one
            console.log("Attempting to call logout endpoint")
            await authService.logout?.()
            if (onClick) {
                console.log("Executing additional onClick callback")
                onClick()
            }
        } catch (error) {
            console.error("Logout error:", error)
        } finally {
            // Clear auth token regardless of API result
            if (authService.clearAuthToken) {
                authService.clearAuthToken()
            } else {
                // Fallback if clearAuthToken doesn't exist
                localStorage.removeItem('authToken')
                localStorage.removeItem('userRole')
                localStorage.removeItem('defaultDashboard')
                localStorage.removeItem('rememberMe')
                sessionStorage.removeItem('authToken')
                document.cookie = "authToken=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            }

            // Force window reload to clear any memory state
            window.location.href = '/login';
        }
    }

    // Add variant-based styling
    const variantClasses = variant === 'outline'
        ? 'border border-red-500 rounded px-3 py-1'
        : '';

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                handleLogout()
            }}
            className={`flex items-center gap-2 text-red-600 hover:text-red-800 transition-colors ${variantClasses} ${className}`}
        >
            {children || (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                    </svg>
                    Logout
                </>
            )}
        </button>
    )
}
