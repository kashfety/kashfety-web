'use client'

import { CheckCircle } from 'lucide-react'
import { useLocale } from '@/components/providers/locale-provider'
import { getLandingTranslation } from '@/lib/landing-translations'
import { toArabicNumerals } from '@/lib/i18n'

export function About() {
  const { locale } = useLocale()
  const t = getLandingTranslation(locale)
  const isArabic = locale === 'ar'

  return (
    <section id="about" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-white dark:from-slate-800 to-slate-50 dark:to-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
          {/* Left: Text content */}
          <div className="fade-in-up">
            <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
              {t.about.title}
            </h2>
            <h3 className={`text-xl sm:text-2xl text-teal-600 dark:text-teal-400 font-semibold mb-4 sm:mb-6 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
              {t.about.mission}
            </h3>
            <p className={`text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-6 sm:mb-8 leading-relaxed transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
              {t.about.description}
            </p>

            {/* Values grid - responsive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {t.about.values.map((value, idx) => (
                <div key={idx} className={`flex items-start gap-2 sm:gap-3 fade-in-up stagger-${(idx % 4) + 1}`}>
                  <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5 transition-transform duration-300 hover:scale-110" />
                  <span className={`text-sm sm:text-base text-slate-700 dark:text-slate-300 font-medium transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Visual element - responsive */}
          <div className="relative fade-in-up stagger-2">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-100 dark:from-teal-900/30 to-blue-100 dark:to-blue-900/30 rounded-2xl blur-2xl opacity-30 dark:opacity-20 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative bg-gradient-to-br from-teal-50 dark:from-slate-800 to-blue-50 dark:to-slate-800 rounded-2xl p-6 sm:p-8 border border-teal-200 dark:border-slate-700 shadow-lg hover:shadow-xl dark:hover:shadow-teal-500/20 transition-shadow duration-300">
              <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
                <div className="hover:scale-105 transition-transform duration-300">
                  <p className="text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400" dir="ltr">
                    {toArabicNumerals('500+', locale)}
                  </p>
                  <p className={`text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                    {t.about.stats.medicalCenters}
                  </p>
                </div>
                <div className="hover:scale-105 transition-transform duration-300">
                  <p className="text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400" dir="ltr">
                    {locale === 'ar' ? toArabicNumerals('10', locale) + 'ألف+' : toArabicNumerals('10k+', locale)}
                  </p>
                  <p className={`text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                    {t.about.stats.happyPatients}
                  </p>
                </div>
                <div className="hover:scale-105 transition-transform duration-300">
                  <p className="text-2xl sm:text-3xl font-bold text-teal-600 dark:text-teal-400" dir="ltr">
                    {toArabicNumerals('4.9', locale)}
                  </p>
                  <p className={`text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                    {t.about.stats.rating}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
