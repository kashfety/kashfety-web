"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Mail, MapPin, Users2, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useLocale } from "@/components/providers/locale-provider"
import { cn } from "@/lib/utils"

interface Doctor {
  id: string;
  name: string;
  nameAr?: string;
  avatar?: string;
  specialty: string;
  specialtyKey?: string;
  status: "available" | "busy" | "offDuty";
  patients?: number;
  nextAppointment?: string;
  room?: string;
}

export default function DoctorOverview() {
  const { t, isRTL, locale } = useLocale();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Progressive loading for better UX - show skeleton immediately
        // Phase 1: Load basic doctor data quickly
        setTimeout(async () => {
          try {
            // Replace with your actual API call when ready
            // const data = await doctorService.getActiveDoctors();
            
            // For now, showing empty state quickly instead of blocking for 1 second
            setDoctors([]);
            setLoading(false);
          } catch (err) {
            setError("Failed to load doctors");
            setLoading(false);
          }
        }, 150); // Reduced from 1000ms to 150ms for much faster loading

      } catch (err) {
        setError("Failed to load doctors");
        setLoading(false);
      }
    };

    fetchDoctors();
  }, []);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "available":
        return {
          className:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
          dotColor: "bg-emerald-500",
          animation: "animate-pulse-soft",
        }
      case "busy":
        return {
          className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 border-red-200 dark:border-red-800",
          dotColor: "bg-red-500",
          animation: "animate-ping",
        }
      case "offDuty":
        return {
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
          dotColor: "bg-gray-400",
          animation: "",
        }
      default:
        return {
          className:
            "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700",
          dotColor: "bg-gray-400",
          animation: "",
        }
    }
  }

  return (
    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
      <CardHeader className="pb-6">
        <div className={cn("flex items-center justify-between", isRTL && "flex-row-reverse")}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-emerald">
              <Users2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl text-gray-900 dark:text-white">{t("doctorsOverview")}</CardTitle>
              <CardDescription className="text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                {t("currentStatusSchedule")}
              </CardDescription>
            </div>
          </div>
          <Link href="/doctors">
            <Button
              variant="outline"
              className="border-emerald-200 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 hover-scale group"
            >
              {t("viewAllDoctors")}
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading doctors...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : doctors.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-gray-600 dark:text-gray-400">No doctors available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doctor, index) => {
              const statusConfig = getStatusConfig(doctor.status);

              return (
                <Card
                  key={doctor.id}
                  className="border-0 shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/10 transition-all duration-500 hover-lift group glass-effect"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <CardContent className="p-6 relative overflow-hidden">
                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                    {/* Doctor Header */}
                    <div className={cn("flex items-start justify-between mb-6", isRTL && "flex-row-reverse")}>
                      <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                        <div className="relative">
                          <Avatar className="h-12 w-12 ring-2 ring-emerald-100 dark:ring-emerald-900/50 hover-scale transition-transform duration-300">
                            <AvatarImage src={doctor.avatar || "/placeholder.svg"} alt={doctor.name} />
                            <AvatarFallback className="gradient-emerald-soft text-emerald-700 dark:text-emerald-400 font-semibold">
                              {doctor.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={cn(
                              "absolute -top-1 -right-1 w-4 h-4 rounded-full",
                              statusConfig.dotColor,
                              statusConfig.animation,
                            )}
                          ></div>
                        </div>
                        <div className={cn(isRTL && "text-right")}>
                          <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                            {locale === "ar" && doctor.nameAr ? doctor.nameAr : doctor.name}
                          </h3>
                          <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80 font-medium">
                            {doctor.specialtyKey ? t(doctor.specialtyKey) : doctor.specialty}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("text-xs font-semibold", statusConfig.className)}>{t(doctor.status)}</Badge>
                    </div>

                    {/* Stats */}
                    <div className="space-y-3 mb-6">
                      {doctor.patients !== undefined && (
                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-soft"></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {doctor.patients} {t("patientsToday")}
                          </span>
                        </div>
                      )}
                      {doctor.nextAppointment && (
                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                          <div
                            className="w-2 h-2 rounded-full bg-blue-500 animate-pulse-soft"
                            style={{ animationDelay: "0.5s" }}
                          ></div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("nextAppointment")}: {doctor.nextAppointment}
                          </span>
                        </div>
                      )}
                      {doctor.room && (
                        <div className={cn("flex items-center gap-3", isRTL && "flex-row-reverse")}>
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {t("room")} {doctor.room}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      className={cn(
                        "flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800",
                        isRTL && "flex-row-reverse",
                      )}
                    >
                      <div className={cn("flex gap-2", isRTL && "flex-row-reverse")}>
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
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                      <Link href={`/doctors/${doctor.id}`}>
                        <Button
                          size="sm"
                          className="gradient-emerald text-white hover-scale hover:shadow-lg hover:shadow-emerald-500/25 transition-all duration-300 group"
                        >
                          {t("viewDetails")}
                          <ArrowRight className="h-3 w-3 ml-1 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </Link>
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
