"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback, startTransition } from "react"
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
  const [locale, setLocaleState] = useState<Locale>(() => {
    // Initialize from localStorage if available (SSR-safe)
    if (typeof window !== "undefined") {
      const savedLocale = localStorage.getItem("locale") as Locale
      if (savedLocale && ["en", "ar"].includes(savedLocale)) {
        return savedLocale
      }
    }
    return defaultLocale
  })
  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale === locale) {
      return
    }

    startTransition(() => {
      setLocaleState(newLocale)
    })
  }, [locale])

  const t = (key: string): string => {
    return getTranslation(locale, key)
  }

  useEffect(() => {
    // Apply locale effects after state update (outside interaction handler)
    if (typeof window !== "undefined") {
      localStorage.setItem("locale", locale)
      document.documentElement.lang = locale
      document.documentElement.dir = isRTL(locale) ? "rtl" : "ltr"
    }
  }, [locale])

  // Don't block rendering - provide the locale immediately
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
