'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Patient dashboard "home" — redirect to the main landing page.
 * When logged in as a patient, the dashboard is the same (new) landing page with patient access.
 * This avoids 404 for /patient-dashboard and keeps one entry point for patients.
 */
export default function PatientDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/')
  }, [router])

  return null
}
