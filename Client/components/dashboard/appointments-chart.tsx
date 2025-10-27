"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const defaultData = [
  { name: "Jan", appointments: 24, consultations: 18 },
  { name: "Feb", appointments: 32, consultations: 25 },
  { name: "Mar", appointments: 28, consultations: 20 },
  { name: "Apr", appointments: 35, consultations: 28 },
  { name: "May", appointments: 30, consultations: 22 },
  { name: "Jun", appointments: 38, consultations: 30 },
  { name: "Jul", appointments: 42, consultations: 35 },
]

export default function AppointmentsChart({ data }: { data?: { name: string; appointments: number; consultations: number }[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
      <CardHeader>
        <CardTitle>Appointments Trend</CardTitle>
        <CardDescription>Your appointments and consultations over time</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data && data.length ? data : defaultData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
              <XAxis
                dataKey="name"
                stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)"}
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: isDark ? "#1f2937" : "#ffffff",
                  border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                  color: isDark ? "#ffffff" : "#000000",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="appointments"
                name="Appointments"
                stroke={isDark ? "#10b981" : "#059669"}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: isDark ? "#10b981" : "#059669" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
              <Line
                type="monotone"
                dataKey="consultations"
                name="Consultations"
                stroke={isDark ? "#6366f1" : "#4f46e5"}
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: isDark ? "#6366f1" : "#4f46e5" }}
                activeDot={{ r: 6, strokeWidth: 0 }}
                animationDuration={1500}
                animationEasing="ease-in-out"
                animationBegin={300}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
