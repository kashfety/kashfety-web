'use client'

import { Calendar, Clock, CheckCircle } from 'lucide-react'
import { useLocale } from '@/components/providers/locale-provider'
import { getLandingTranslation } from '@/lib/landing-translations'

export function HowItWorks() {
  const { locale, isRTL } = useLocale()
  const t = getLandingTranslation(locale)
  const isArabic = locale === 'ar'

  const steps = [
    { icon: Calendar, ...t.howItWorks.steps[0] },
    { icon: Clock, ...t.howItWorks.steps[1] },
    { icon: CheckCircle, ...t.howItWorks.steps[2] },
  ]

  return (
    <section className="relative py-16 sm:py-20 md:py-24 px-4 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      {/* Background accent elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-60 h-60 sm:w-96 sm:h-96 bg-teal-50 dark:bg-teal-900/20 rounded-full blur-3xl opacity-40 dark:opacity-20 parallax-float" />
      <div className="absolute bottom-0 right-0 w-48 h-48 sm:w-72 sm:h-72 bg-blue-100/30 dark:bg-blue-900/10 rounded-full blur-3xl parallax-float-reverse" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Section title */}
        <div className="text-center mb-12 sm:mb-16 md:mb-20 fade-in">
          <h2 className={`text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
            {t.howItWorks.title}
          </h2>
          <div className="w-16 sm:w-20 h-1 bg-gradient-to-r from-teal-600 to-teal-400 mx-auto rounded-full" />
        </div>

        {/* Steps Container */}
        <div className="relative">
          {/* Connection line for desktop */}
          <div className="hidden md:block absolute top-1/4 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-teal-200 dark:via-teal-700 to-transparent" />

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {steps.map((step, idx) => {
              const Icon = step.icon
              const isLastCard = idx === steps.length - 1
              const isRtl = isArabic

              return (
                <div
                  key={idx}
                  className={`relative fade-in-up stagger-${idx + 1} group`}
                >
                  {/* Step number badge */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20">
                    <div className="flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-400 dark:to-teal-500 text-white font-bold text-sm sm:text-lg shadow-lg shimmer border-4 border-white dark:border-slate-900">
                      {step.number}
                    </div>
                  </div>

                  {/* Card */}
                  <div className="bg-gradient-to-br from-slate-50 dark:from-slate-800 to-blue-50 dark:to-slate-800 rounded-2xl p-6 sm:p-8 pt-12 sm:pt-14 text-center hover:shadow-2xl dark:hover:shadow-teal-500/30 hover:-translate-y-2 transition-all duration-300 border border-slate-100 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-500 relative overflow-hidden">
                    {/* Icon circle with enhanced styling */}
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-teal-100 dark:from-teal-900/60 to-blue-100 dark:to-blue-900/60 mb-4 sm:mb-6 mx-auto shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300 border-2 border-teal-200 dark:border-teal-700/50">
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-teal-600 dark:text-teal-300" />
                    </div>

                    <h3 className={`text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2 sm:mb-3 transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                      {step.title}
                    </h3>
                    <p className={`text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed transition-colors duration-300 ${isArabic ? 'font-arabic' : ''}`}>
                      {step.description}
                    </p>

                    {/* Arrow indicator for desktop - improved positioning */}
                    {!isLastCard && (
                      <div
                        className={`hidden md:flex absolute top-1/2 -translate-y-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                          isRtl ? '-left-12' : '-right-12'
                        }`}
                      >
                        <div className="text-3xl text-teal-400 dark:text-teal-500 font-light leading-none">
                          {isRtl ? '←' : '→'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
