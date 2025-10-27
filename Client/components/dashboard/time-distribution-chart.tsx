"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

const data = [
  { name: "Consultations", hours: 18, fill: "#10b981" },
  { name: "Procedures", hours: 12, fill: "#6366f1" },
  { name: "Documentation", hours: 8, fill: "#f59e0b" },
  { name: "Research", hours: 6, fill: "#ef4444" },
]

export default function TimeDistributionChart() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
      <CardHeader>
        <CardTitle>Time Distribution</CardTitle>
        <CardDescription>How you spend your working hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={140}
                paddingAngle={4}
                dataKey="hours"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={{ stroke: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", strokeWidth: 1 }}
                animationDuration={1500}
                animationEasing="ease-in-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.fill}
                    stroke={isDark ? "#1f2937" : "#ffffff"}
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [`${value} hours`, name]}
                contentStyle={{
                  backgroundColor: isDark ? "#1f2937" : "#ffffff",
                  border: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                  borderRadius: "12px",
                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                  color: isDark ? "#ffffff" : "#000000",
                }}
              />
              <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ paddingTop: "20px" }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
