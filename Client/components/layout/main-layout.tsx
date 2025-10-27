"use client"

import type { ReactNode } from "react"
import Sidebar from "./sidebar"
import TopNav from "./top-nav"
import { useLocale } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"
import { Sparkles, X } from "lucide-react"
import { useState } from "react"

interface LayoutProps {
  children: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export default function MainLayout({ children, breadcrumbs = [] }: LayoutProps) {
  const { isRTL, t } = useLocale()
  const [showBanner, setShowBanner] = useState(true)

  return (
    <div className={cn("flex h-screen bg-white dark:bg-gray-900", isRTL && "rtl")}>
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Kashfety Coming Soon Banner */}
        {showBanner && (
          <div className="relative bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white px-4 py-3 shadow-lg z-50">
            <div className="flex items-center justify-center gap-3 relative">
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse"></div>
                <div className="absolute top-0 right-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: "1s" }}></div>
              </div>

              <Sparkles className="h-5 w-5 animate-pulse-soft relative z-10" />
              <span className="font-bold text-lg relative z-10">{t("kashfetyComingSoon")}</span>
              <span className="hidden sm:inline text-white/90 relative z-10">•</span>
              <span className="hidden sm:inline text-white/90 relative z-10">{t("kashfetyDescription")}</span>

              <button
                onClick={() => setShowBanner(false)}
                className="absolute right-2 p-1 hover:bg-white/20 rounded-full transition-colors duration-200"
                aria-label="Close banner"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <TopNav breadcrumbs={breadcrumbs} />
        <main className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">{children}</main>
      </div>
    </div>
  )
}
