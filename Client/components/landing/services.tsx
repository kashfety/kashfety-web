'use client'

import { Stethoscope, Beaker, Home } from 'lucide-react'
import { useLocale } from '@/components/providers/locale-provider'
import { getLandingTranslation } from '@/lib/landing-translations'

export function Services() {
  const { locale } = useLocale()
  const t = getLandingTranslation(locale)
  const isArabic = locale === 'ar'

  const serviceIcons = [Stethoscope, Beaker, Home]
  const services = t.services.services.map((service, idx) => ({
    ...service,
    icon: serviceIcons[idx],
  }))

  return (
    <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 dark:from-slate-900 to-white dark:to-slate-800 transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16 fade-in">
          <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-3 sm:mb-4 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
            {t.services.title}
          </h2>
          <p className={`text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
            {t.services.description}
          </p>
        </div>

        {/* Services grid - responsive columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {services.map((service, idx) => {
            const Icon = service.icon
            return (
              <div
                key={idx}
                className={`bg-white dark:bg-slate-800 rounded-xl p-5 sm:p-6 border border-slate-100 dark:border-slate-700 hover:shadow-xl dark:hover:shadow-teal-500/20 hover:-translate-y-1 transition-all duration-300 fade-in-up stagger-${(idx % 3) + 1}`}
              >
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-teal-100 dark:from-teal-900/50 to-blue-100 dark:to-blue-900/50 flex items-center justify-center mb-4 shadow-sm">
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <h3 className={`text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-2 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                  {service.title}
                </h3>
                <p className={`text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                  {service.description}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
