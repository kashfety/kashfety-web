"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { Locale } from "@/lib/i18n"
import { defaultLocale, isRTL, getTranslation } from "@/lib/i18n"

interface LocaleContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  isRTL: boolean
  t: (key: string) => string
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined)

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)
  const [mounted, setMounted] = useState(false)

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", newLocale)
      document.documentElement.lang = newLocale
      document.documentElement.dir = isRTL(newLocale) ? "rtl" : "ltr"
    }
  }

  const t = (key: string): string => {
    return getTranslation(locale, key)
  }

  useEffect(() => {
    setMounted(true)
    if (typeof window !== "undefined") {
      const savedLocale = localStorage.getItem("locale") as Locale
      if (savedLocale && ["en", "ar"].includes(savedLocale)) {
        setLocale(savedLocale)
      } else {
        const browserLang = navigator.language.split("-")[0]
        if (browserLang === "ar") {
          setLocale("ar")
        }
      }
    }
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <LocaleContext.Provider
      value={{
        locale,
        setLocale,
        isRTL: isRTL(locale),
        t,
      }}
    >
      {children}
    </LocaleContext.Provider>
  )
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return context
}
