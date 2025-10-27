"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"

const defaultData = [
  {
    name: "Mon",
    patients: 4,
  },
  {
    name: "Tue",
    patients: 7,
  },
  {
    name: "Wed",
    patients: 5,
  },
  {
    name: "Thu",
    patients: 8,
  },
  {
    name: "Fri",
    patients: 6,
  },
  {
    name: "Sat",
    patients: 3,
  },
  {
    name: "Sun",
    patients: 0,
  },
]

type WeeklyDatum = { name: string; patients: number }

export default function ScheduleChart({ data }: { data?: WeeklyDatum[] }) {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
        <CardDescription>Your patient appointments this week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data && data.length ? data : defaultData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" }}
              />
              <Legend />
              <Bar
                dataKey="patients"
                name="Patients"
                fill={isDark ? "#10b981" : "#059669"}
                radius={[4, 4, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-in-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
