"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import MainLayout from "@/components/layout/main-layout"
import StatsCard from "@/components/dashboard/stats-card"
import AppointmentsList from "@/components/dashboard/appointments-list"
import ScheduleChart from "@/components/dashboard/schedule-chart"
import AppointmentsChart from "@/components/dashboard/appointments-chart"
import { Users, Calendar, Clock, FileText, Activity, Zap, Stethoscope, UserPlus, BarChart3, Settings, Link as LinkIcon } from "lucide-react"
import { useLocale } from "@/components/providers/locale-provider"
import { useAuth } from "@/lib/providers/auth-provider"
import { Card } from "@/components/ui/card"

export default function DoctorProfessionalDashboard() {
  const { t } = useLocale()
  const { user } = useAuth()
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Set comprehensive page title
    const doctorName = user?.name ? `Dr. ${user.name}` : "Doctor"
    document.title = `${doctorName} Professional Dashboard | Healthcare Management System`
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement
            const animationType = element.dataset.animation || "slide-in-up"
            element.classList.add(`animate-${animationType}`)
            observer.unobserve(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: "0px 0px -50px 0px",
        threshold: 0.1,
      },
    )

    setTimeout(() => setIsLoaded(true), 100)

    const animatedElements = document.querySelectorAll(".scroll-animation")
    animatedElements.forEach((el) => observer.observe(el))

    return () => {
      animatedElements.forEach((el) => observer.unobserve(el))
    }
  }, [user])

  // Doctor professional services data
  const doctorServices = [
    {
      title: "Patient Management",
      description: "View and manage your active patients and their medical records",
      icon: <Users className="h-6 w-6 text-white" />,
      color: "bg-blue-500",
      link: "/doctor/patients",
    },
    {
      title: "Appointment Scheduling",
      description: "Manage your schedule and appointment availability",
      icon: <Calendar className="h-6 w-6 text-white" />,
      color: "bg-emerald-500",
      link: "/schedule",
    },
    {
      title: "Analytics & Reports",
      description: "View practice analytics and generate medical reports",
      icon: <BarChart3 className="h-6 w-6 text-white" />,
      color: "bg-indigo-500",
      link: "/analytics",
    },
    {
      title: "Practice Settings",
      description: "Configure your practice preferences and work hours",
      icon: <Settings className="h-6 w-6 text-white" />,
      color: "bg-purple-500",
      link: "/settings",
    },
  ]

  const doctorName = user?.name ? `Dr. ${user.name}'s` : "Doctor"

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/20">
      {/* Sophisticated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-emerald-600/20 rounded-full blur-3xl animate-float-slow"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-500/20 to-emerald-300/20 rounded-full blur-3xl animate-float-slow"
          style={{ animationDelay: "10s" }}
        ></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-emerald-400/5 to-transparent rounded-full animate-breathe"></div>
      </div>

      <MainLayout breadcrumbs={[{ label: t("dashboard") }]}>
        <div className="space-y-8 relative z-10">
          {/* Hero Header */}
          <div className={`scroll-animation ${isLoaded ? "animate-morph-in" : ""} delay-100`}>
            <div className="relative p-8 rounded-3xl glass-effect">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-2xl gradient-emerald animate-glow">
                  <Stethoscope className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">
                    {doctorName} Professional Dashboard
                  </h1>
                  <p className="text-emerald-600/80 dark:text-emerald-400/80 text-lg font-medium mt-1">
                    Welcome back! Here's your comprehensive practice overview for today
                  </p>
                </div>
              </div>

              {/* Live Status Indicator */}
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="relative">
                  <Zap className="h-5 w-5 text-emerald-600 animate-pulse-soft" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
                </div>
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                  You have 3 upcoming appointments • Next patient in 25 minutes
                </span>
              </div>
            </div>
          </div>

          {/* Doctor Professional Services Section */}
          <div className="scroll-animation" data-animation="slide-in-up">
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-emerald-800 bg-clip-text text-transparent">
              Professional Practice Tools
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {doctorServices.map((service, idx) => (
                <Link href={service.link} key={idx} className="block hover-lift">
                  <Card className="h-full border-0 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                    <div className="p-5 flex flex-col h-full">
                      <div className={`rounded-full p-3 ${service.color} w-fit mb-4`}>
                        {service.icon}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{service.title}</h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">{service.description}</p>
                      <div className="mt-auto flex items-center text-emerald-600 dark:text-emerald-400 text-sm font-medium">
                        <span>Access tool</span>
                        <LinkIcon className="h-4 w-4 ml-2" />
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="scroll-animation hover-lift hover-glow" data-animation="scale-in">
              <StatsCard
                title="Active Patients"
                value="47"
                icon={Users}
                description="Total patients under care"
                trend={{ value: 12, isPositive: true }}
                className="gradient-card hover-shimmer delay-100"
              />
            </div>
            <div className="scroll-animation hover-lift hover-glow" data-animation="scale-in">
              <StatsCard
                title="Today's Consultations"
                value="8"
                icon={Calendar}
                description="Scheduled appointments"
                trend={{ value: 2, isPositive: true }}
                className="gradient-card hover-shimmer delay-200"
              />
            </div>
            <div className="scroll-animation hover-lift hover-glow" data-animation="scale-in">
              <StatsCard
                title="Practice Hours"
                value="32"
                icon={Clock}
                description="Clinical hours this week"
                trend={{ value: 5, isPositive: false }}
                className="gradient-card hover-shimmer delay-300"
              />
            </div>
            <div className="scroll-animation hover-lift hover-glow" data-animation="scale-in">
              <StatsCard
                title="Consultations Completed"
                value="23"
                icon={FileText}
                description="This month's appointments"
                trend={{ value: 15, isPositive: true }}
                className="gradient-card hover-shimmer delay-500"
              />
            </div>
          </div>

          {/* Appointments List */}
          <div className="scroll-animation hover-scale" data-animation="slide-in-left">
            <AppointmentsList />
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="scroll-animation hover-lift" data-animation="slide-in-left">
              <ScheduleChart />
            </div>
            <div className="scroll-animation hover-lift" data-animation="slide-in-right">
              <AppointmentsChart />
            </div>
          </div>

          {/* Floating Action Button - shows real upcoming count if available */}
          <div className="fixed bottom-8 right-8 z-50">
            <Link href="/schedule">
              <button className="group relative w-16 h-16 gradient-emerald text-white rounded-2xl shadow-2xl hover:shadow-emerald-500/25 transition-all duration-500 hover-lift animate-float">
                <Calendar className="h-6 w-6 mx-auto group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center animate-breathe">
                  {/* This dashboard is generic; hardcode 3 as before */}
                  3
                </div>
                <div className="absolute inset-0 rounded-2xl bg-emerald-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
              </button>
            </Link>
          </div>
        </div>
      </MainLayout>
    </div>
  )
}
