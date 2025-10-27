import type React from "react"
import { LogOut, MoveUpRight, Settings, User, Shield } from "lucide-react"
import Link from "next/link"

import { useLocale } from "@/components/providers/locale-provider"
interface MenuItem {
  label: string
  value?: string
  href: string
  icon?: React.ReactNode
  external?: boolean
}

export default function ProfileMenu() {
  const { t, isRTL } = useLocale()

  const menuItems: MenuItem[] = [
    {
      label: t('profile') || 'Profile',
      href: "/profile",
      icon: <User className="w-4 h-4" />,
    },
    {
      label: "Admin Settings",
      href: "/settings",
      icon: <Settings className="w-4 h-4" />,
    },
    {
      label: "Permissions",
      href: "/permissions",
      icon: <Shield className="w-4 h-4" />,
    },
  ]

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="relative px-6 pt-6 pb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-700 font-medium text-lg">
                A
              </div>
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-600 ring-2 ring-white dark:ring-black" />
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-semibold text-black dark:text-white">Admin User</h2>
              <p className="text-gray-600 dark:text-gray-400">admin@eduhub.com</p>
            </div>
          </div>
          <div className="h-px bg-gray-200 dark:bg-gray-800 my-4" />
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between p-2 
                  hover:bg-green-50 dark:hover:bg-green-900/20 
                  rounded-lg transition-colors duration-200"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span className="text-sm font-medium text-black dark:text-white">{item.label}</span>
                </div>
                <div className="flex items-center">
                  {item.value && <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">{item.value}</span>}
                  {item.external && <MoveUpRight className="w-4 h-4" />}
                </div>
              </Link>
            ))}

            <button
              type="button"
              className="w-full flex items-center justify-between p-2 
                hover:bg-red-50 dark:hover:bg-red-900/20 
                rounded-lg transition-colors duration-200"
            >
              <div className="flex items-center gap-2">
                <LogOut className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-black dark:text-white">{t('logout')}</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
