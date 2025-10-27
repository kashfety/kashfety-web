"use client"

import { useEffect } from "react"
import MainLayout from "@/components/layout/main-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Filter, Clock, User, Phone } from "lucide-react"

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
  // Set comprehensive page title
  useEffect(() => {
    document.title = "Doctor Schedule Management | Healthcare Appointment System"
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

  return (
    <MainLayout breadcrumbs={[{ label: "Schedule" }]}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 scroll-animation">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Schedule</h1>
          <Button className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Add Appointment
          </Button>
        </div>

        <Card className="scroll-animation animation-delay-200 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-gray-900 dark:text-white">Appointments</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Manage your patient appointments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
                <Input type="search" placeholder="Search patients..." className="pl-9 w-full" />
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10 border-green-200 dark:border-green-700">
                <Filter className="h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-md border border-green-200 dark:border-green-800">
              <Table>
                <TableHeader>
                  <TableRow className="border-green-200 dark:border-green-800">
                    <TableHead className="text-gray-700 dark:text-gray-300">Time</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Patient</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Type</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Duration</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-700 dark:text-gray-300">Contact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment, index) => (
                    <TableRow
                      key={appointment.id}
                      className={`cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/10 transition-colors scroll-animation animation-delay-${(index + 3) * 100} border-green-200 dark:border-green-800`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                          {appointment.time}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <User className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{appointment.patientName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{appointment.notes}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700 dark:text-gray-300">{appointment.type}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-gray-700 dark:text-gray-300">{appointment.duration}</span>
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
                        >
                          {appointment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-500 dark:text-gray-400" />
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
