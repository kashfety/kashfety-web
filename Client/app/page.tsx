'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/components/providers/locale-provider'
import { useAuth } from '@/lib/providers/auth-provider'
import { LandingPage, LandingHeader, LandingFooter } from '@/components/landing'
import BookingModal from '@/components/BookingModal'

export default function HomePage() {
  const { isRTL } = useLocale()
  const { isAuthenticated } = useAuth()
  const router = useRouter()
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [bookingModalMode, setBookingModalMode] = useState<'doctor' | 'lab'>('doctor')

  const handleHeroCtaClick = () => {
    if (!isAuthenticated) {
      router.push('/login')
      return
    }
    setBookingModalMode('doctor')
    setBookingModalOpen(true)
  }

  return (
    <div
      className={`min-h-screen bg-white dark:bg-slate-950 flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <LandingHeader />

      {/* Landing sections */}
      <div className="flex-1 pt-14 sm:pt-16">
        <LandingPage onHeroCtaClick={handleHeroCtaClick} />
      </div>

      <LandingFooter />

      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        initialMode={bookingModalMode}
      />
    </div>
  )
}
