'use client'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/components/providers/locale-provider'
import { useTheme } from 'next-themes'
import { useAuth } from '@/lib/providers/auth-provider'
import { getLandingTranslation } from '@/lib/landing-translations'
import { Globe, Moon, Sun, LogOut } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export function Header() {
  const { locale, setLocale } = useLocale()
  const { theme, setTheme } = useTheme()
  const { user, logout, loading } = useAuth()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const t = getLandingTranslation(locale)
  const isArabic = locale === 'ar'

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleLocale = () => {
    setLocale(isArabic ? 'en' : 'ar')
  }

  const handleAuthAction = () => {
    if (user) {
      logout()
    } else {
      router.push('/login')
    }
  }

  const getDashboardPath = () => {
    if (!user?.role) return '/'
    const role = user.role.toLowerCase()
    const paths: Record<string, string> = {
      super_admin: '/super-admin-dashboard',
      admin: '/admin-dashboard',
      doctor: '/doctor-dashboard',
      patient: '/', // Same as before: patient "dashboard" is the (new) landing page with patient access
    }
    return paths[role] ?? '/'
  }

  if (!mounted) return null

  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 transition-all duration-300">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-1 hover:opacity-80 transition-opacity duration-200 min-w-fit"
        >
          <div className="relative h-7 w-8 sm:h-8 sm:w-9 md:h-9 md:w-10 flex-shrink-0 overflow-hidden">
            <Image
              src={mounted && theme === 'dark' ? '/logo/branding-dark.png' : '/logo/branding-light.png'}
              alt={t.header.brandName}
              fill
              className="object-cover object-left"
              priority
            />
          </div>
          <span className="font-bold text-sm sm:text-lg text-slate-900 dark:text-white transition-colors duration-300 hidden sm:inline">
            {t.header.brandName}
          </span>
        </Link>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-1.5 sm:p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-all duration-300 hover:shadow-sm active:scale-95 flex-shrink-0"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium text-xs sm:text-sm transition-all duration-300 hover:shadow-sm active:scale-95 flex-shrink-0"
          >
            <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">{isArabic ? t.header.languageEn : t.header.languageAr}</span>
            <span className="sm:hidden">{isArabic ? t.header.languageShortEn : t.header.languageShortAr}</span>
          </button>

          {/* Auth: Sign In or Dashboard + Logout */}
          {loading ? (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="hidden md:inline-flex border-slate-200 dark:border-slate-700 h-9 sm:h-10 text-xs sm:text-sm"
            >
              {t.header.loading}
            </Button>
          ) : user ? (
            <>
              <Link href={getDashboardPath()}>
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden md:inline-flex border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-900 dark:text-white transition-all duration-300 h-9 sm:h-10 text-xs sm:text-sm"
                >
                  {t.header.dashboard}
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAuthAction}
                className="border-red-500/70 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 h-9 sm:h-10 text-xs sm:text-sm inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.header.logout}</span>
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              asChild
              className="hidden md:inline-flex border-slate-200 dark:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-900 dark:text-white transition-all duration-300 hover:shadow-sm active:scale-95 text-xs sm:text-sm h-9 sm:h-10"
            >
              <Link href="/login">{t.header.signIn}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
