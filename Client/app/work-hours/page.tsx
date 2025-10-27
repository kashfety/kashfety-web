"use client"

import { useEffect } from "react"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, TrendingUp, Users } from "lucide-react"

export default function WorkHoursPage() {
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

  const weeklySchedule = [
    { day: "Monday", hours: "8:00 AM - 5:00 PM", patients: 8, status: "completed" },
    { day: "Tuesday", hours: "8:00 AM - 5:00 PM", patients: 7, status: "completed" },
    { day: "Wednesday", hours: "8:00 AM - 5:00 PM", patients: 6, status: "completed" },
    { day: "Thursday", hours: "8:00 AM - 5:00 PM", patients: 9, status: "today" },
    { day: "Friday", hours: "8:00 AM - 3:00 PM", patients: 5, status: "scheduled" },
    { day: "Saturday", hours: "9:00 AM - 1:00 PM", patients: 3, status: "scheduled" },
    { day: "Sunday", hours: "Off", patients: 0, status: "off" },
  ]

  return (
    <MainLayout breadcrumbs={[{ label: "Work Hours" }]}>
      <div className="space-y-6">
        <div className="scroll-animation">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Work Hours</h1>
          <p className="text-gray-600 dark:text-gray-400">Track your working schedule and hours</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="scroll-animation animation-delay-100 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">This Week</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">42</p>
                  <p className="text-xs text-gray-500">hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-animation animation-delay-200 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Patients</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">38</p>
                  <p className="text-xs text-gray-500">this week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-animation animation-delay-300 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Daily</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">7.5</p>
                  <p className="text-xs text-gray-500">hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="scroll-animation animation-delay-400 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Efficiency</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">94%</p>
                  <p className="text-xs text-gray-500">utilization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Schedule */}
        <Card className="scroll-animation animation-delay-500 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Weekly Schedule</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Your working hours and patient load for this week
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklySchedule.map((schedule, index) => (
                <div
                  key={schedule.day}
                  className={`flex items-center justify-between p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 scroll-animation animation-delay-${(index + 6) * 100}`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <p className="font-medium text-gray-900 dark:text-white">{schedule.day}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{schedule.hours}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {schedule.patients > 0 ? `${schedule.patients} patients` : "No patients"}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      schedule.status === "completed"
                        ? "success"
                        : schedule.status === "today"
                          ? "default"
                          : schedule.status === "off"
                            ? "outline"
                            : "secondary"
                    }
                  >
                    {schedule.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
