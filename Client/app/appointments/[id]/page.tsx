"use client"

import { useEffect } from "react"
import { useParams } from "next/navigation"
import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, Clock, Phone, Mail, FileText, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

// Helper function to get badge variant based on status
const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case "confirmed":
    case "completed":
      return "success";
    case "cancelled":
    case "no-show":
      return "destructive";
    case "pending":
      return "outline";
    default:
      return "default";
  }
};

// Mock data - in real app this would come from API
const getAppointmentData = (id: string) => {
  const appointments = {
    "apt-1": {
      id: "apt-1",
      patientName: "Ahmad Khalil",
      patientAvatar: "/placeholder.svg?height=80&width=80",
      patientId: "patient-123",
      time: "10:30 AM",
      date: "2024-06-02",
      duration: "30 min",
      type: "Consultation",
      status: "upcoming",
      notes: "Follow-up on medication",
      phone: "(555) 123-4567",
      email: "ahmad.khalil@email.com",
      reason: "Follow-up on blood pressure medication",
      history: [
        { date: "2024-05-15", type: "Consultation", notes: "Initial prescription for hypertension" },
        { date: "2024-04-02", type: "Check-up", notes: "Annual physical examination" },
      ],
    },
    "apt-2": {
      id: "apt-2",
      patientName: "Fatima Hassan",
      patientAvatar: "/placeholder.svg?height=80&width=80",
      patientId: "patient-456",
      time: "11:15 AM",
      date: "2024-06-02",
      duration: "45 min",
      type: "Check-up",
      status: "upcoming",
      notes: "Annual physical examination",
      phone: "(555) 234-5678",
      email: "fatima.hassan@email.com",
      reason: "Annual physical examination",
      history: [
        { date: "2023-06-05", type: "Check-up", notes: "Previous annual examination" },
        { date: "2023-09-12", type: "Consultation", notes: "Seasonal allergies" },
      ],
    },
    "apt-3": {
      id: "apt-3",
      patientName: "Omar Nasser",
      patientAvatar: "/placeholder.svg?height=80&width=80",
      patientId: "patient-789",
      time: "1:00 PM",
      date: "2024-06-02",
      duration: "30 min",
      type: "Consultation",
      status: "upcoming",
      notes: "",
      phone: "(555) 345-6789",
      email: "omar.nasser@email.com",
      reason: "First visit - general consultation",
      history: [],
    },
    "apt-4": {
      id: "apt-4",
      patientName: "Layla Mahmoud",
      patientAvatar: "/placeholder.svg?height=80&width=80",
      patientId: "patient-101",
      time: "2:30 PM",
      date: "2024-06-02",
      duration: "60 min",
      type: "Treatment",
      status: "upcoming",
      notes: "Procedure scheduled",
      phone: "(555) 456-7890",
      email: "layla.mahmoud@email.com",
      reason: "Physical therapy session for shoulder pain",
      history: [
        { date: "2024-05-20", type: "Consultation", notes: "Initial assessment of shoulder pain" },
        { date: "2024-05-27", type: "Treatment", notes: "First physical therapy session" },
      ],
    },
  }
  return appointments[id as keyof typeof appointments]
}

export default function AppointmentDetailPage() {
  const params = useParams()
  const appointmentId = params.id as string
  const appointment = getAppointmentData(appointmentId)
  const [status, setStatus] = useState(appointment?.status || "upcoming")

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

  if (!appointment) {
    return (
      <MainLayout breadcrumbs={[{ label: "Appointments", href: "/appointments" }, { label: "Not Found" }]}>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-black dark:text-white">Appointment Not Found</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">The requested appointment could not be found.</p>
          <Link href="/appointments">
            <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white">Back to Appointments</Button>
          </Link>
        </div>
      </MainLayout>
    )
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "upcoming":
        return "default"
      case "in-progress":
        return "success"
      case "completed":
        return "outline"
      case "no-show":
        return "destructive"
      default:
        return "outline"
    }
  }

  const markAsInProgress = () => {
    setStatus("in-progress")
  }

  const markAsCompleted = () => {
    setStatus("completed")
  }

  const markAsNoShow = () => {
    setStatus("no-show")
  }

  // Check if appointment time is current (for auto-start)
  const isCurrentAppointment = () => {
    // This is a simplified check - in a real app, you'd compare with the current time
    const now = new Date()
    const appointmentDate = new Date(appointment.date)

    // Check if appointment is today
    return now.toDateString() === appointmentDate.toDateString()
  }

  return (
    <MainLayout breadcrumbs={[{ label: "Appointments", href: "/appointments" }, { label: "Appointment Details" }]}>
      <div className="space-y-6">
        {/* Appointment Header */}
        <Card className="scroll-animation bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              <div className="flex items-start space-x-4">
                <Link href="/appointments">
                  <Button variant="outline" size="icon" className="mt-1">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-black dark:text-white">{appointment.type}</h1>
                    <Badge variant={getStatusBadgeVariant(status)}>
                      {status === "no-show" ? "No Show" : status.replace("-", " ")}
                    </Badge>
                  </div>
                  <p className="text-lg text-gray-600 dark:text-gray-400">
                    {new Date(appointment.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    • {appointment.time}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">{appointment.duration} appointment</p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                {status === "upcoming" && isCurrentAppointment() && (
                  <>
                    <Button onClick={markAsInProgress} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Start Appointment
                    </Button>
                    <Button
                      variant="outline"
                      onClick={markAsNoShow}
                      className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Mark No-Show
                    </Button>
                  </>
                )}
                {status === "in-progress" && (
                  <Button onClick={markAsCompleted} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Complete Appointment
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Patient Info and Appointment Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient Info */}
          <Card className="scroll-animation animation-delay-200 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 md:col-span-1">
            <CardHeader>
              <CardTitle>Patient Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center mb-6">
                <Avatar className="h-24 w-24 mb-4">
                  <AvatarImage src={appointment.patientAvatar || "/placeholder.svg"} alt={appointment.patientName} />
                  <AvatarFallback className="bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-400 text-xl">
                    {appointment.patientName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-black dark:text-white">{appointment.patientName}</h2>
                <Link href={`/patients/${appointment.patientId}`}>
                  <Button variant="link" className="text-emerald-600 dark:text-emerald-400 p-0 h-auto">
                    View Patient Profile
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Phone className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-black dark:text-white">Phone</p>
                    <p className="text-gray-600 dark:text-gray-400">{appointment.phone}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="font-medium text-black dark:text-white">Email</p>
                    <p className="text-gray-600 dark:text-gray-400">{appointment.email}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card className="scroll-animation animation-delay-300 bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 md:col-span-2">
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="history">Patient History</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="details">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-black dark:text-white mb-2">Appointment Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3">
                          <Calendar className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-black dark:text-white">Date</p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {new Date(appointment.date).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Clock className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-medium text-black dark:text-white">Time</p>
                            <p className="text-gray-600 dark:text-gray-400">
                              {appointment.time} ({appointment.duration})
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium text-black dark:text-white mb-2">Reason for Visit</h3>
                      <p className="text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {appointment.reason || "No reason provided"}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="history">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-black dark:text-white">Previous Visits</h3>

                    {appointment.history && appointment.history.length > 0 ? (
                      <div className="space-y-4">
                        {appointment.history.map((visit, index) => (
                          <div key={index} className="p-4 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                            <div className="flex justify-between mb-2">
                              <p className="font-medium text-black dark:text-white">{visit.type}</p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {new Date(visit.date).toLocaleDateString()}
                              </p>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400">{visit.notes}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        No previous visit history available.
                      </p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="notes">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-black dark:text-white">Appointment Notes</h3>

                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg min-h-[200px]">
                      <p className="text-gray-600 dark:text-gray-400">
                        {appointment?.notes || "No notes have been added for this appointment."}
                      </p>
                    </div>

                    <div className="flex justify-end">
                      <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <FileText className="h-4 w-4 mr-2" />
                        Add Notes
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
