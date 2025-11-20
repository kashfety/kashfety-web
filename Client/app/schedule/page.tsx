"use client"

import { useEffect } from "react"
import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, Clock, User, Phone } from "lucide-react"
import { useLanguage } from '@/lib/i18n'
import { formatLocalizedNumber, formatLocalizedDate, formatLocalizedTime } from '@/lib/i18n'

// Sample data for appointments
const appointments = [
  {
    id: "1",
    patientName: "John Smith",
    time: "09:00 AM",
    duration: "30 min",
    type: "Consultation",
    status: "confirmed",
    phone: "(555) 123-4567",
    notes: "Regular checkup",
  },
  {
    id: "2",
    patientName: "Sarah Johnson",
    time: "10:00 AM",
    duration: "45 min",
    type: "Follow-up",
    status: "confirmed",
    phone: "(555) 234-5678",
    notes: "Blood pressure monitoring",
  },
  {
    id: "3",
    patientName: "Michael Brown",
    time: "11:30 AM",
    duration: "30 min",
    type: "Consultation",
    status: "pending",
    phone: "(555) 345-6789",
    notes: "First visit",
  },
  {
    id: "4",
    patientName: "Emily Davis",
    time: "02:00 PM",
    duration: "60 min",
    type: "Treatment",
    status: "confirmed",
    phone: "(555) 456-7890",
    notes: "Physical therapy session",
  },
  {
    id: "5",
    patientName: "David Wilson",
    time: "03:30 PM",
    duration: "30 min",
    type: "Emergency",
    status: "urgent",
    phone: "(555) 567-8901",
    notes: "Urgent care needed",
  },
]

export default function SchedulePage() {
  const { t, locale, isRTL } = useLanguage()

  // Set comprehensive page title
  useEffect(() => {
    const title = t('schedule_page_title') || "Doctor Schedule Management | Healthcare Appointment System"
    document.title = title
  }, [t])

  // Set up intersection observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-slide-up")
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: 0.1,
      },
    )

    const animatedElements = document.querySelectorAll(".scroll-animation")
    animatedElements.forEach((el) => observer.observe(el))

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el))
    }
  }, [])

  return (
    <MainLayout breadcrumbs={[{ label: t('schedule_breadcrumb') || "Schedule" }]}>
      <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 scroll-animation">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('today_schedule') || "Today's Schedule"}</h1>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
            <Plus className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
            {t('add_appointment') || "Add Appointment"}
          </Button>
        </div>

        <Card className="scroll-animation animation-delay-200 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-emerald-200 dark:border-emerald-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 dark:text-white">{t('schedule_appointments') || "Appointments"}</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t('manage_patient_appointments') || "Manage your patient appointments"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className={`absolute ${isRTL ? 'right-2.5' : 'left-2.5'} top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400`} />
                <Input
                  type="search"
                  placeholder={t('search_patients') || "Search patients..."}
                  className={`${isRTL ? 'pr-9' : 'pl-9'} w-full`}
                />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border border-emerald-200 dark:border-emerald-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-emerald-200 dark:border-emerald-800">
                    <TableHead className="text-gray-700 dark:text-gray-300">{t('schedule_time') || "Time"}</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">{t('schedule_patient') || "Patient"}</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">{t('schedule_type') || "Type"}</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">{t('schedule_duration') || "Duration"}</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">{t('schedule_status') || "Status"}</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">{t('schedule_contact') || "Contact"}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment, index) => (
                    <TableRow
                      key={appointment.id}
                      className={`cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/10 transition-colors scroll-animation animation-delay-${(index + 3) * 100} border-emerald-200 dark:border-emerald-800`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Clock className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} text-emerald-600 dark:text-emerald-400`} />
                          {formatLocalizedTime(appointment.time, locale)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'} text-gray-500 dark:text-gray-400`} />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{appointment.patientName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.notes}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700 dark:text-gray-300">
                          {t(`appointment_type_${appointment.type.toLowerCase()}`) || appointment.type}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700 dark:text-gray-300">
                          {t(`duration_${appointment.duration.replace(' ', '_').toLowerCase()}`) || appointment.duration}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            appointment.status === "confirmed"
                              ? "default"
                              : appointment.status === "urgent"
                                ? "destructive"
                                : "outline"
                          }
                          className={
                            appointment.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                              : ""
                          }
                        >
                          {t(`schedule_status_${appointment.status}`) || appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className={`h-3.5 w-3.5 ${isRTL ? 'ml-1.5' : 'mr-1.5'} text-gray-500 dark:text-gray-400`} />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{appointment.phone}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
