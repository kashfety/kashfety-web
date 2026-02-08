'use client'

import { Button } from '@/components/ui/button'
import { Typewriter } from '@/components/landing/animations/typewriter'
import { useLocale } from '@/components/providers/locale-provider'
import { getLandingTranslation } from '@/lib/landing-translations'
import { ArrowRight, Heart } from 'lucide-react'

export interface HeroProps {
  onCtaClick?: () => void
}

export function Hero({ onCtaClick }: HeroProps) {
  const { locale, isRTL } = useLocale()
  const t = getLandingTranslation(locale)
  const isArabic = locale === 'ar'

  return (
    <section className="relative overflow-hidden bg-white dark:bg-gradient-to-b dark:from-slate-950 dark:to-slate-900 pt-20 sm:pt-28 md:pt-32 pb-20 sm:pb-28 md:pb-32 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      {/* Parallax background elements with animated orbs - responsive sizing */}
      <div className="absolute top-5 sm:top-10 right-2 sm:right-20 w-40 h-40 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-teal-100 dark:bg-teal-900/30 rounded-full blur-3xl opacity-30 dark:opacity-20 parallax-float orbit-float" />
      <div className="absolute -bottom-10 sm:-bottom-20 -left-5 sm:-left-20 w-40 h-40 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-3xl opacity-20 dark:opacity-15 parallax-float-reverse orbit-float" style={{ animationDelay: '1s' }} />
      <div className="hidden md:block absolute top-1/2 left-1/4 w-72 h-72 bg-purple-100 dark:bg-purple-900/30 rounded-full blur-3xl opacity-15 dark:opacity-10 parallax-float-slow orbit-float" style={{ animationDelay: '2s' }} />

      {/* Accent orbs for UI polish */}
      <div className="absolute top-1/3 right-1/4 sm:right-1/3 w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 bg-gradient-to-br from-teal-200/20 to-cyan-200/10 dark:from-teal-800/20 dark:to-cyan-800/10 rounded-full blur-2xl scale-in" />
      <div className="hidden sm:block absolute bottom-1/4 left-1/3 w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 bg-gradient-to-br from-blue-200/15 to-purple-200/10 dark:from-blue-800/15 dark:to-purple-800/10 rounded-full blur-3xl parallax-float-slow" style={{ animationDelay: '0.5s' }} />

      <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center justify-start pt-8 sm:pt-12 md:pt-16 min-h-[500px] sm:min-h-[600px]">
        {/* Tagline */}
        <div className="inline-flex items-center justify-center gap-2 mb-4 sm:mb-6 md:mb-8 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 fade-in-down transition-colors duration-300">
          <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-teal-600 dark:text-teal-400 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-medium text-teal-700 dark:text-teal-300">{t.hero.tagline}</span>
        </div>

        {/* Main headline with typewriter - centered */}
        <div className="mb-4 sm:mb-6 md:mb-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight text-slate-900 dark:text-white fade-in-up stagger-1 transition-colors duration-300 min-h-16 sm:min-h-20 md:min-h-24 flex items-center justify-center">
            <Typewriter text={t.hero.headline} speed={80} delay={200} />
          </h1>
        </div>

        {/* Slogan */}
        <div className="mb-6 sm:mb-8 md:mb-12 text-center">
          <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-semibold text-teal-600 dark:text-teal-400 fade-in-up stagger-2 transition-colors duration-300">
            {t.hero.slogan}
          </p>
        </div>

        {/* CTA Button */}
        <div className="fade-in-up stagger-3">
          <Button
            size="lg"
            onClick={onCtaClick}
            className="bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-lg px-5 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 text-sm sm:text-base md:text-lg font-medium inline-flex items-center gap-2 transition-all duration-300 hover:gap-3 hover:shadow-lg hover:-translate-y-0.5 dark:shadow-lg dark:shadow-teal-500/30"
          >
            {t.hero.cta}
            <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 transition-transform duration-300" />
          </Button>
        </div>
      </div>
    </section>
  )
}
