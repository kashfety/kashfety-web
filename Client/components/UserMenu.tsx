"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useLocale } from "@/components/providers/locale-provider"

interface UserMenuProps {
    userName: string
    userRole: string
    isLoading?: boolean
}

export default function UserMenu({ userName, userRole, isLoading = false }: UserMenuProps) {
    const { t } = useLocale()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false)
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    return (
        <div className="relative" ref={menuRef}>
            {/* Profile Button */}
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center space-x-3 focus:outline-none"
                disabled={isLoading}
            >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                    {isLoading ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        userName?.[0]?.toUpperCase() || "U"
                    )}
                </div>
                <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-700">
                        {isLoading ? "Loading..." : (userName || "User")}
                    </div>
                    <div className="text-xs text-gray-500 capitalize">
                        {userRole}
                    </div>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </button>

            {/* Dropdown Menu - Removed logout button */}
            {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-700">{userName}</p>
                        <p className="text-xs text-gray-500 capitalize">{userRole}</p>
                    </div>

                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Profile
                    </Link>
                    <Link href="/settings" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                        Settings
                    </Link>
                </div>
            )}
        </div>
    )
}
