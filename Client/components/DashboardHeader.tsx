"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/providers/auth-provider"
import UserMenu from "./UserMenu"

import { useLocale } from "@/components/providers/locale-provider"
import { ThemeToggle } from "./theme-toggle"
import { LocaleSwitcher } from "./ui/locale-switcher"

interface DashboardHeaderProps {
    pageTitle?: string
}

export default function DashboardHeader({ pageTitle }: DashboardHeaderProps) {
    const { t, isRTL } = useLocale()
    const resolvedTitle = pageTitle || t('dashboard')

    const { user, logout, isAuthenticated, loading } = useAuth()

    // Helper function to get dashboard path based on role
    const getDashboardPath = (role?: string): string => {
        switch (role?.toLowerCase()) {
            case 'super_admin':
                return '/super-admin-dashboard'
            case 'admin':
                return '/admin-dashboard'
            case 'doctor':
                return '/doctor-dashboard'
            case 'patient':
            default:
                return '/' // Redirect patients to the new landing page
        }
    }

    // Direct logout function
    const handleDirectLogout = async () => {
        try {
            await logout()
        } catch (error) {
            // Fallback logout
            localStorage.removeItem('auth_token')
            sessionStorage.removeItem('auth_token')
            document.cookie = "auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            window.location.href = '/login';
        }
    }

    return (
        <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            <div className="w-full px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href={getDashboardPath(user?.role)} className="text-xl font-bold text-emerald-600">
                                {t('app_name') || 'Kashfety'}
                            </Link>
                        </div>
                        <div className={`ml-6 flex items-center ${isRTL ? 'space-x-reverse space-x-4' : 'space-x-4'}`}>
                            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">{resolvedTitle}</h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <LocaleSwitcher />
                        <ThemeToggle />
                        {/* Direct logout button */}
                        <a
                            href="#"
                            onClick={(e) => {
                                e.preventDefault();
                                handleDirectLogout();
                            }}
                            className="flex items-center gap-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                            </svg>
                            Logout
                        </a>

                        {/* User menu */}
                        <UserMenu
                            userName={user?.name || "User"}
                            userRole={user?.role || "guest"}
                            isLoading={loading}
                        />
                    </div>
                </div>
            </div>
        </header>
    )
}
