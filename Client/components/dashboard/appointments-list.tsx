"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, FileText, ArrowRight, Calendar, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useLocale } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"

interface Appointment {
  id: string;
  patientName: string;
  patientAvatar?: string;
  time: string;
  duration: string;
  type: string;
  status: "upcoming" | "in-progress" | "completed" | "no-show";
  notes?: string;
  // Add loading states for progressive loading
  isDetailLoading?: boolean;
}

export default function AppointmentsList() {
  const { t, isRTL } = useLocale();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Progressive loading: Load basic appointment data first, then details
  useEffect(() => {
    const fetchAppointmentsProgressively = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Phase 1: Show skeleton immediately for perceived performance
        
        // Phase 2: Load basic appointment data quickly (essential info only)
        setTimeout(async () => {
          try {
            // Replace with your actual API call for basic appointment data
            // const basicData = await appointmentService.getTodaysAppointmentsBasic();
            
            // Simulate loading basic appointment data
            const basicAppointments: Appointment[] = [
              // Example data - replace with real API call
              // {
              //   id: '1',
              //   patientName: 'Loading...',
              //   time: '10:00 AM',
              //   duration: '30 min',
              //   type: 'Consultation',
              //   status: 'upcoming',
              //   isDetailLoading: true
              // }
            ];
            
            setAppointments(basicAppointments);
            setLoading(false);
            
            // Phase 3: Load detailed information in background (non-blocking)
            if (basicAppointments.length > 0) {
              loadAppointmentDetails(basicAppointments);
            }
            
          } catch (err) {
            setError(t("err_load_appointments_msg"));
            setLoading(false);
          }
        }, 150); // Fast initial load
        
      } catch (err) {
        setError(t("err_load_appointments_msg"));
        setLoading(false);
      }
    };

    fetchAppointmentsProgressively();
  }, []);

  // Load detailed appointment information progressively
  const loadAppointmentDetails = async (basicAppointments: Appointment[]) => {
    try {
      setIsLoadingDetails(true);
      
      // Simulate loading detailed data (patient info, notes, etc.)
      setTimeout(() => {
        // Replace with your actual API call for detailed data
        // const detailedData = await appointmentService.getAppointmentDetails(basicAppointments.map(a => a.id));
        
        // Update appointments with detailed information
        setAppointments(prev => prev.map(apt => ({
          ...apt,
          isDetailLoading: false,
          // Add any additional details loaded from API
        })));
        
        setIsLoadingDetails(false);
      }, 300); // Additional 300ms for details (total 450ms vs original 1000ms)
      
    } catch (err) {
      setIsLoadingDetails(false);
    }
  };

  // Function to mark appointment as no-show
  const markAsNoShow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Replace with your actual API call
      // await appointmentService.updateAppointmentStatus(id, "no-show");

      // Update local state
      setAppointments(prev => prev.map(apt =>
        apt.id === id ? { ...apt, status: "no-show" } : apt
      ));
    } catch (error) {
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "upcoming":
        return {
          className:
            "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800",
          dotColor: "bg-blue-500",
        }
      case "in-progress":
        return {
          className:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          dotColor: "bg-emerald-500",
          animation: "animate-pulse-soft",
        }
      case "completed":
        return {
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
          dotColor: "bg-gray-400",
        }
      case "no-show":
        return {
          className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800",
          dotColor: "bg-red-500",
        }
      default:
        return {
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
          dotColor: "bg-gray-400",
        }
    }
  }

  // Check if appointment time is current
  const isCurrentAppointment = (time: string) => {
    const now = new Date();
    const [timeStr, period] = time.split(" ");
    const [hourStr, minuteStr] = timeStr.split(":");

    let hours = parseInt(hourStr, 10);
    const minutes = parseInt(minuteStr, 10);

    // Convert to 24-hour format
    if (period === "PM" && hours < 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;

    // Get current time
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();

    // Check if within 5 minutes
    return Math.abs(hours - currentHours) <= 1 && Math.abs(minutes - currentMinutes) <= 30;
  };

  // Skeleton Loading Component for better UX
  const AppointmentSkeleton = () => (
    <div className="space-y-4">
      {[1, 2, 3].map((index) => (
        <Card key={index} className="border-0 shadow-lg animate-pulse">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              {/* Time Column Skeleton */}
              <div className="flex flex-col items-center justify-center w-20 mr-4">
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-6 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>

              {/* Patient Info Skeleton */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div>
                    <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-1"></div>
                    <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </div>
                </div>
              </div>

              {/* Actions Skeleton */}
              <div className="flex gap-2">
                <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-9 w-9 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-9 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
      <CardHeader className="pb-6">
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-emerald">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">Today's Appointments</CardTitle>
              <CardDescription className="text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                Your schedule for{" "}
                {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                {isLoadingDetails && (
                  <span className="inline-flex items-center gap-1 ml-2 text-xs text-gray-500">
                    <div className="w-3 h-3 border border-gray-300 border-t-emerald-500 rounded-full animate-spin"></div>
                    Loading details...
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <Link href="/appointments">
            <Button
              variant="outline"
              className="border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover-scale group"
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <AppointmentSkeleton />
        ) : error ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">{t("unable_to_load_appointments")}</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-400">{error}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setError(null);
                  // Restart the progressive loading process
                  window.location.reload();
                }}
              >
                {t("retry")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => setError(null)}
              >
                {t("dismiss")}
              </Button>
            </div>
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <p className="mt-4 text-gray-600">{t("no_appointments_today")}</p>
            <Link href="/appointments/new">
              <Button className="mt-4 gradient-emerald text-white">
                {t("schedule_appointment")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {appointments.map((appointment) => {
              const statusConfig = getStatusConfig(appointment.status);
              const isActive = appointment.status === "in-progress" || isCurrentAppointment(appointment.time);

              return (
                <Card
                  key={appointment.id}
                  className={cn(
                    "border-0 shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 hover-lift group glass-effect",
                    isActive && "ring-2 ring-emerald-500 dark:ring-emerald-400",
                  )}
                >
                  <CardContent className="p-6 relative overflow-hidden">
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                    <div className={cn("flex items-start justify-between", isRTL && "flex-row-reverse")}>
                      {/* Time Column */}
                      <div className={cn("flex flex-col items-center justify-center w-20", isRTL ? "ml-4" : "mr-4")}>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{appointment.time}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{appointment.duration}</div>
                        <Badge className={cn("mt-2 text-xs", statusConfig.className)}>
                          {appointment.status === "no-show" ? "No Show" : appointment.status.replace("-", " ")}
                        </Badge>
                      </div>

                      {/* Patient Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Avatar className="h-10 w-10 ring-2 ring-emerald-100 dark:ring-emerald-900/50">
                            <AvatarImage
                              src={appointment.patientAvatar || "/placeholder.svg"}
                              alt={appointment.patientName}
                            />
                            <AvatarFallback className="gradient-emerald-soft text-emerald-700 dark:text-emerald-400">
                              {appointment.isDetailLoading ? '...' : appointment.patientName.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">
                              {appointment.isDetailLoading ? (
                                <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              ) : (
                                appointment.patientName
                              )}
                            </h3>
                            <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                              {appointment.isDetailLoading ? (
                                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
                              ) : (
                                appointment.type
                              )}
                            </p>
                          </div>
                        </div>
                        {appointment.notes && !appointment.isDetailLoading && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{appointment.notes}</p>
                        )}
                        {appointment.isDetailLoading && (
                          <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1"></div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 hover-scale hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-300"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9 w-9 p-0 hover-scale hover:bg-blue-50 hover:border-blue-300 transition-all duration-300"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>

                        <div className="flex gap-2">
                          <Link href={`/appointments/${appointment.id}`}>
                            <Button
                              size="sm"
                              className="gradient-emerald text-white hover-scale hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 group"
                            >
                              View
                              <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </Link>
                          {appointment.status === "upcoming" && isCurrentAppointment(appointment.time) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="hover-scale hover:bg-red-50 hover:border-red-300 transition-all duration-300"
                              onClick={(e) => markAsNoShow(appointment.id, e)}
                            >
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
