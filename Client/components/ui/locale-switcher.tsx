"use client"

import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Languages } from "lucide-react"
import { useLocale } from "@/components/providers/locale-provider"
import type { Locale } from "@/lib/i18n"

const localeNames = {
  en: "English",
  ar: "العربية",
}

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useLocale()

  const handleLocaleSelect = useCallback((code: Locale) => {
    if (code === locale) {
      return
    }
    setLocale(code)
  }, [locale, setLocale])

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <Languages className="h-4 w-4" />
          <span className="sr-only">{t("switch_language")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        {Object.entries(localeNames).map(([code, name]) => (
          <DropdownMenuItem
            key={code}
            onSelect={() => handleLocaleSelect(code as Locale)}
            disabled={locale === code}
            className={`cursor-pointer ${locale === code
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                : "hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
          >
            {name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
