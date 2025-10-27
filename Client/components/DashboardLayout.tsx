"use client"

import { ReactNode } from "react"
import Link from "next/link"
import UserMenu from "./UserMenu"
import { useLocale } from "@/components/providers/locale-provider"

interface DashboardLayoutProps {
    children: ReactNode
    user?: {
        name?: string
        email?: string
        avatar?: string
        role?: string
    }
}

export default function DashboardLayout({ children, user = {} }: DashboardLayoutProps) {
    const { t } = useLocale()
    
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* Top navigation */}
            <header className="bg-gray-800 text-white">
                <div className="container mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link href="/doctor-dashboard" className="text-xl font-bold flex items-center gap-2">
                            <div className="bg-emerald-500 text-white p-2 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21a48.309 48.309 0 01-8.135-1.687c-1.718-.293-2.3-2.379-1.067-3.611L5 14.5" />
                                </svg>
                            </div>
                            DocPortal
                        </Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder={t('search')}
                                className="w-64 bg-gray-700 text-white rounded-full py-2 px-4 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"
                                className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                            </svg>
                        </div>

                        <UserMenu user={user} />
                    </div>
                </div>
            </header>

            {/* Main content */}
            <div className="flex flex-1">
                {/* Sidebar navigation */}
                <aside className="w-64 bg-gray-900 text-white">
                    {/* sidebar content */}
                    <nav className="py-4">
                        <ul>
                            <li>
                                <Link href="/doctor-dashboard" className="block px-4 py-2 hover:bg-gray-800">Dashboard</Link>
                            </li>
                            <li>
                                <Link href="/appointments" className="block px-4 py-2 hover:bg-gray-800">Appointments</Link>
                            </li>
                            <li>
                                <Link href="/patients" className="block px-4 py-2 hover:bg-gray-800">Patients</Link>
                            </li>
                            <li>
                                <Link href="/analytics" className="block px-4 py-2 hover:bg-gray-800">Analytics</Link>
                            </li>
                        </ul>
                    </nav>
                </aside>

                {/* Page content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    )
}
