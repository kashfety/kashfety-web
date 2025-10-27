"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"

const data = [
  { name: "Dr. Ahmad", hours: 38, fill: "#15803d" },
  { name: "Dr. Sarah", hours: 32, fill: "#dc2626" },
  { name: "Dr. Mohammed", hours: 28, fill: "#000000" },
  { name: "Dr. Layla", hours: 24, fill: "#ffffff" },
]

export default function WorkHoursChart() {
  const { theme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Hours Distribution</CardTitle>
        <CardDescription>Total hours worked by each doctor this week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="hours"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
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
                  borderRadius: "6px",
                  color: isDark ? "#ffffff" : "#000000",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
