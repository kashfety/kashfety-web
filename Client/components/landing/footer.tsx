'use client'

import { useLocale } from '@/components/providers/locale-provider'
import { getLandingTranslation } from '@/lib/landing-translations'
import { toArabicNumerals } from '@/lib/i18n'
import Link from 'next/link'

export function Footer() {
  const { locale } = useLocale()
  const t = getLandingTranslation(locale)
  const isArabic = locale === 'ar'

  return (
    <footer className="bg-slate-900 dark:bg-slate-950 text-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <h3 className="font-bold text-base sm:text-lg mb-2 sm:mb-4 text-white">{t.footer.brandName}</h3>
            <p className={`text-xs sm:text-sm text-slate-400 dark:text-slate-500 ${isArabic ? 'font-arabic' : ''}`}>
              {t.footer.tagline}
            </p>
          </div>

          {/* Company links */}
          <div>
            <h4 className={`font-semibold text-sm mb-2 sm:mb-4 ${isArabic ? 'font-arabic' : ''}`}>
              {t.footer.company}
            </h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/#about"
                  className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors"
                >
                  {t.footer.about}
                </Link>
              </li>
              <li>
                <a
                  href="#"
                  className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors"
                >
                  {t.footer.contact}
                </a>
              </li>
            </ul>
          </div>

          {/* Legal links */}
          <div>
            <h4 className={`font-semibold text-sm mb-2 sm:mb-4 ${isArabic ? 'font-arabic' : ''}`}>
              {t.footer.legal}
            </h4>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <Link
                  href="/privacy-policy"
                  className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors"
                >
                  {t.footer.privacy}
                </Link>
              </li>
              <li>
                <Link
                  href="/terms-and-conditions"
                  className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors"
                >
                  {t.footer.terms}
                </Link>
              </li>
              <li>
                <a
                  href="/logo/kashfety-bimi.svg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-300 transition-colors"
                >
                  Brand Logo (SVG)
                </a>
              </li>
            </ul>
          </div>

          {/* App download */}
          <div className="col-span-2 sm:col-span-1">
            <h4 className={`font-semibold text-sm mb-2 sm:mb-4 ${isArabic ? 'font-arabic' : ''}`}>
              {t.about.appDownload}
            </h4>
            <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-slate-400 dark:text-slate-500">
              <p>{t.about.appComingSoon}</p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-800 dark:border-slate-800 pt-6 sm:pt-8">
          <p
            className={`text-center text-xs sm:text-sm text-slate-400 dark:text-slate-500 ${isArabic ? 'font-arabic' : ''}`}
          >
            {toArabicNumerals(t.footer.copyright, locale)}
          </p>
        </div>
      </div>
    </footer>
  )
}
