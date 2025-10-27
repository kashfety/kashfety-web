"use client"

import { useEffect, useMemo, useState } from "react"
import MainLayout from "@/components/layout/main-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart2, Users, Calendar, Clock, User, MapPin, Stethoscope, DollarSign, TrendingUp, Activity, PieChart } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import ScheduleChart from "@/components/dashboard/schedule-chart"
import AppointmentsChart from "@/components/dashboard/appointments-chart"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"

import { useLocale } from "@/components/providers/locale-provider"
import { useAuth } from "@/lib/providers/auth-provider"

export default function AnalyticsPage() {
  const { t } = useLocale()
  const { token, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState<{
    totalPatients: number
    thisMonthAppointments: number
    completionRate: number
    avgRating: number
    totalRevenue: number
    monthlyRevenue?: number
    todayStats?: {
      todayAppointments: number
      todayRevenue: number
    }
    patientDemographics?: {
      ageGroups?: Record<string, number>
      genderDistribution?: Record<string, number>
      appointmentTypes?: Record<string, number>
    }
    weeklyData?: Array<{ name: string; patients: number; revenue: number }>
    recentBookings?: Array<{ 
      id: string
      patient_name: string
      appointment_date: string
      status: string
      type: string
    }>
  } | null>(null)

  // Set comprehensive page title
  useEffect(() => {
    document.title = "Practice Analytics & Reports | Healthcare Management Dashboard"
  }, [])

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

  // Fetch analytics from API (real data via auth; falls back to supabase query in route when no token)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const query = !token && user?.id ? `?doctor_id=${encodeURIComponent(user.id)}` : ""
        const res = await fetch(`/api/doctor-dashboard/analytics${query}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          cache: "no-store",
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Failed to load analytics')
        setAnalytics((json?.analytics as any) || json)
      } catch (e: any) {
        setError(e?.message || 'Failed to load analytics')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [token, user?.id])

  const demographics = useMemo(() => analytics?.patientDemographics || { ageGroups: {}, genderDistribution: {}, appointmentTypes: {} }, [analytics])
  const sumValues = (obj?: Record<string, number>) => Object.values(obj || {}).reduce((a, b) => a + (Number(b) || 0), 0)

  // Enhanced performance metrics with revenue from nav bar
  const performanceMetrics = analytics
    ? [
        { 
          metric: 'Total Revenue', 
          value: `$${(analytics.totalRevenue || 0).toLocaleString()}`, 
          isPositive: true,
          icon: DollarSign,
          description: 'All time revenue'
        },
        { 
          metric: 'Monthly Revenue', 
          value: `$${(analytics.monthlyRevenue || analytics.totalRevenue || 0).toLocaleString()}`, 
          isPositive: true,
          icon: TrendingUp,
          description: 'This month earnings'
        },
        { 
          metric: 'Total Patients', 
          value: `${analytics.totalPatients || 0}`, 
          isPositive: true,
          icon: Users,
          description: 'Unique patients served'
        },
        { 
          metric: 'Appointments', 
          value: `${analytics.thisMonthAppointments || 0}`, 
          isPositive: true,
          icon: Calendar,
          description: 'This month appointments'
        },
        { 
          metric: 'Success Rate', 
          value: `${analytics.completionRate || 0}%`, 
          isPositive: true,
          icon: Activity,
          description: 'Completion rate'
        },
        { 
          metric: 'Patient Rating', 
          value: `${(analytics.avgRating || 0).toFixed(1)}/5`, 
          isPositive: true,
          icon: BarChart2,
          description: 'Average satisfaction'
        },
      ]
    : []

  return (
    <MainLayout breadcrumbs={[{ label: "Analytics" }]}>
      <div className="space-y-6">
        {/* Header with Theme Toggle */}
        <div className="scroll-animation flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-emerald">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Practice Analytics</h1>
              <p className="text-emerald-600/80 dark:text-emerald-400/80">
                Comprehensive insights and performance metrics
              </p>
            </div>
          </div>
          
          {/* Theme Toggle and Quick Stats */}
          <div className="flex items-center gap-4">
            {/* Quick Revenue Display */}
            <div className="hidden md:flex items-center gap-4 mr-4">
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">Today's Revenue</div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  ${analytics?.todayStats?.todayRevenue?.toLocaleString() || '0'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 dark:text-gray-400">This Month</div>
                <div className="text-sm font-medium text-green-600 dark:text-green-400">
                  ${(analytics?.monthlyRevenue || analytics?.totalRevenue || 0).toLocaleString()}
                </div>
              </div>
            </div>
            
            <ThemeToggle />
          </div>
        </div>

        {/* Enhanced Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(loading && performanceMetrics.length === 0 ? [1, 2, 3, 4, 5, 6] : performanceMetrics).map((metric: any, index: number) => (
            <Card
              key={index}
              className={`scroll-animation animation-delay-${(index + 1) * 100} bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 hover:shadow-lg transition-all duration-300`}
            >
              <CardContent className="p-6">
                {loading && performanceMetrics.length === 0 ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 w-28 bg-emerald-100 dark:bg-emerald-800 rounded" />
                    <div className="h-7 w-20 bg-emerald-200 dark:bg-emerald-700 rounded" />
                    <div className="h-3 w-32 bg-emerald-100 dark:bg-emerald-800 rounded" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
                        {metric.icon && <metric.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {metric.isPositive ? '+' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{metric.metric}</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{metric.description}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="scroll-animation animation-delay-500">
            {(() => {
              // Build weekly data from upcoming appointments (today-stats fallback not present here),
              // so use completion rate split – if analytics lacks granular days, keep placeholder
              const weekly = [
                { name: 'Mon', patients: 0 },
                { name: 'Tue', patients: 0 },
                { name: 'Wed', patients: 0 },
                { name: 'Thu', patients: 0 },
                { name: 'Fri', patients: 0 },
                { name: 'Sat', patients: 0 },
                { name: 'Sun', patients: 0 },
              ]
              return <ScheduleChart data={weekly} />
            })()}
          </div>
          <div className="scroll-animation animation-delay-600">
            {(() => {
              const a: any = analytics
              const trend = a?.monthlyTrend as { month: string; appointments: number; consultations?: number }[] | undefined
              const data = (trend && trend.length)
                ? trend.map(r => ({ name: r.month, appointments: r.appointments, consultations: r.consultations ?? Math.round(r.appointments*0.8) }))
                : []
              return <AppointmentsChart data={data} />
            })()}
          </div>
        </div>

        {/* Patient Demographics */}
        <Card className="scroll-animation animation-delay-800 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Patient Demographics</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Breakdown of your patient population
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Age Distribution</p>
                </div>
                <div className="space-y-2 mt-4">
                  {(() => {
                    const groups = (analytics?.patientDemographics?.ageGroups) || {}
                    const order = ["0-18", "19-35", "36-50", "51-65", "65+"]
                    const total = Math.max(1, Object.values(groups).reduce((a, b) => a + (Number(b) || 0), 0))
                    return order.map((k) => {
                      const label = k === "0-18" ? "Under 18" : k === "65+" ? "Over 65" : k
                      const value = Math.round(((groups[k] || 0) / total) * 100)
                      return (
                        <div key={k} className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{value}%</p>
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Visit Frequency</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Weekly</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">5%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Monthly</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">15%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quarterly</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">35%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bi-annually</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">25%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Annually</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">20%</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Appointment Duration</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">15 minutes</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">10%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">30 minutes</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">45%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">45 minutes</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">30%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">60+ minutes</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">15%</p>
                  </div>
                </div>
              </div>

              {/* Gender Distribution */}
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Gender Distribution</p>
                </div>
                <div className="space-y-3 mt-4">
                  {(() => {
                    const g = analytics?.patientDemographics?.genderDistribution || {}
                    const total = Math.max(1, Object.values(g).reduce((a, b) => a + (Number(b) || 0), 0))
                    const rows = [
                      { label: "Female", key: "female" },
                      { label: "Male", key: "male" },
                      { label: "Other/Unspecified", key: "other" },
                    ]
                    return rows.map((r) => {
                      const pct = Math.round(((g[r.key] || 0) / total) * 100)
                      return (
                        <div key={r.key}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <p className="text-gray-600 dark:text-gray-400">{r.label}</p>
                            <p className="font-medium text-gray-900 dark:text-white">{pct}%</p>
                          </div>
                          <Progress value={pct} className="h-2 bg-emerald-100" />
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Appointment Types */}
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <Stethoscope className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Appointment Types</p>
                </div>
                <div className="space-y-3 mt-4">
                  {(() => {
                    const types = analytics?.patientDemographics?.appointmentTypes || {}
                    const total = Math.max(1, Object.values(types).reduce((a, b) => a + (Number(b) || 0), 0))
                    const rows = [
                      { label: "Clinic Consultation", key: "clinic", color: "bg-emerald-500" },
                      { label: "Home Visit", key: "home", color: "bg-emerald-400" },
                      { label: "Telemedicine", key: "telemedicine", color: "bg-emerald-300" },
                    ]
                    return rows.map((r) => {
                      const pct = Math.round(((types[r.key] || 0) / total) * 100)
                      return (
                        <div key={r.key} className="mt-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${r.color}`}></span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 flex-1">{r.label}</p>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{pct}%</span>
                          </div>
                          <Progress value={pct} className="h-2 bg-emerald-100 mt-1" />
                        </div>
                      )
                    })
                  })()}
                </div>
              </div>

              {/* Top Locations */}
              <div className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="h-5 w-5 text-emerald-600" />
                  <p className="font-medium text-gray-900 dark:text-white">Top Locations</p>
                </div>
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Downtown</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">38%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">North District</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">27%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">East Side</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">19%</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Other</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">16%</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  )
}
