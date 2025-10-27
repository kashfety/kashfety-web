"use client"

import type React from "react"
import { Calendar, ChevronLeft, ChevronRight, Home, Settings, Stethoscope, Users, BarChart2 } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useLocale } from "@/components/providers/locale-provider"

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { t, isRTL } = useLocale()

  function toggleSidebar() {
    setIsCollapsed(!isCollapsed)
  }

  function NavItem({
    href,
    icon: Icon,
    children,
  }: {
    href: string
    icon: any
    children: React.ReactNode
  }) {
    const isActive = pathname === href || pathname?.startsWith(`${href}/`)

    return (
      <Link
        href={href}
        className={cn(
          "flex items-center px-4 py-3 text-sm rounded-2xl transition-all duration-300 group hover-shimmer relative overflow-hidden",
          isRTL && "flex-row-reverse",
          "hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover-scale",
          isActive
            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25"
            : "text-gray-700 dark:text-gray-300 hover:text-emerald-700 dark:hover:text-emerald-400",
        )}
      >
        <Icon
          className={cn(
            "h-5 w-5 flex-shrink-0 transition-all duration-300 group-hover:scale-110",
            isActive && "animate-pulse-soft",
          )}
        />
        <span
          className={cn(
            "transition-all duration-300 font-medium",
            isRTL ? "mr-3" : "ml-3",
            isCollapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100",
          )}
        >
          {children}
        </span>
        {isActive && !isCollapsed && (
          <div
            className={cn("absolute w-1 h-8 bg-white/30 rounded-full animate-pulse-soft", isRTL ? "left-2" : "right-2")}
          ></div>
        )}
      </Link>
    )
  }

  const ChevronIcon = isCollapsed ? (isRTL ? ChevronLeft : ChevronRight) : isRTL ? ChevronRight : ChevronLeft

  return (
    <nav
      className={cn(
        "glass-effect border-r border-emerald-100/50 dark:border-emerald-900/50 transition-all duration-500 relative",
        isCollapsed ? "w-20" : "w-72",
      )}
    >
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/30 via-white/50 to-emerald-50/30 dark:from-emerald-950/20 dark:via-gray-900/50 dark:to-emerald-950/20 pointer-events-none"></div>

      <div className="h-full flex flex-col relative z-10">
        {/* Header */}
        <div className="h-20 px-6 flex items-center justify-between border-b border-emerald-100/50 dark:border-emerald-900/50">
          <Link
            href="/doctor-dashboard"
            className={cn(
              "flex items-center gap-4 hover-scale transition-all duration-300",
              isRTL && "flex-row-reverse",
            )}
          >
            <div className="p-2.5 rounded-2xl gradient-emerald animate-glow">
              <Stethoscope className="h-6 w-6 text-white" />
            </div>
            {!isCollapsed && (
              <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-800 bg-clip-text text-transparent">
                DocPortal
              </span>
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all duration-300 hover-scale"
          >
            <ChevronIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <div className="space-y-2">
            <div className="animate-slide-in-left delay-100">
              <NavItem href="/doctor-dashboard" icon={Home}>
                {t("dashboard")}
              </NavItem>
            </div>
            <div className="animate-slide-in-left delay-200">
              <NavItem href="/doctor-dashboard?tab=appointments" icon={Calendar}>
                {t("appointments")}
              </NavItem>
            </div>
            <div className="animate-slide-in-left delay-300">
              <NavItem href="/doctor-dashboard?tab=patients" icon={Users}>
                {t("patients")}
              </NavItem>
            </div>
            <div className="animate-slide-in-left delay-400">
              <NavItem href="/doctor-dashboard?tab=analytics" icon={BarChart2}>
                {t("analytics")}
              </NavItem>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-6 border-t border-emerald-100/50 dark:border-emerald-900/50">
          <div className="animate-fade-in delay-1000">
            <NavItem href="/settings" icon={Settings}>
              Settings
            </NavItem>
          </div>
        </div>
      </div>
    </nav>
  )
}
