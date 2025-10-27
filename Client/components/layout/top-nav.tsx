"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ChevronRight, ChevronLeft, Search } from "lucide-react"
import ProfileMenu from "./profile-menu"
import Link from "next/link"
import { ThemeToggle } from "../theme-toggle"
import { LocaleSwitcher } from "../ui/locale-switcher"
import { Input } from "@/components/ui/input"
import { useLocale } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface TopNavProps {
  breadcrumbs?: BreadcrumbItem[]
}

export default function TopNav({ breadcrumbs = [] }: TopNavProps) {
  const { t, isRTL } = useLocale()
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight

  return (
    <header className="h-16 px-6 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
      {/* Breadcrumbs */}
      <div className={cn("flex items-center text-sm", isRTL ? "space-x-reverse" : "space-x-1")}>
        {breadcrumbs.map((item, index) => (
          <div key={item.label} className="flex items-center">
            {index > 0 && <ChevronIcon className={cn("h-4 w-4 text-gray-400", isRTL ? "ml-1" : "mx-1")} />}
            {item.href ? (
              <Link
                href={item.href}
                className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-white font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </div>

      {/* Search and Actions */}
      <div className={cn("flex items-center gap-4", isRTL && "flex-row-reverse")}>
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className={cn("absolute top-2.5 h-4 w-4 text-gray-400", isRTL ? "right-3" : "left-3")} />
          <Input
            type="search"
            placeholder={t("search")}
            className={cn(
              "w-64 h-9 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600",
              isRTL ? "pr-10 text-right" : "pl-10",
            )}
            dir={isRTL ? "rtl" : "ltr"}
          />
        </div>

        {/* Actions */}
        <div className={cn("flex items-center gap-2", isRTL && "flex-row-reverse")}>
          <LocaleSwitcher />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="focus:outline-none">
              <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-medium">
                Dr
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-80 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
            >
              <ProfileMenu />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
