"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useLocale } from '@/components/providers/locale-provider'

export function ThemeToggle() {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme } = useTheme()
  const { t } = useLocale()

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
    >
      <Sun className="h-5 w-5 text-black dark:text-white transition-all dark:hidden" />
      <Moon className="h-5 w-5 text-black dark:text-white transition-all hidden dark:block" />
      <span className="sr-only">{t("toggle_theme")}</span>
    </button>
  )
}
