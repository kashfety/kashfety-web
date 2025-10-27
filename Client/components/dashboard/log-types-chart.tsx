"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chart, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Cell, Pie, PieChart, ResponsiveContainer, Legend, Text } from "recharts"

import { useLocale } from "@/components/providers/locale-provider"

export default function LogTypesChart() {
  const { t, isRTL } = useLocale()
  
  // Restore the original colorful palette for the pie chart
  const data = [
    { name: t('login') || 'Login', value: 540, color: "#4f46e5" }, // Indigo
    { name: "Create", value: 320, color: "#10b981" }, // Emerald
    { name: "Update", value: 280, color: "#f59e0b" }, // Amber
    { name: t('delete') || 'Delete', value: 120, color: "#ef4444" }, // Red
    { name: "Other", value: 180, color: "#8b5cf6" }, // Purple
  ]

  // Calculate total logs
  const totalLogs = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <Card className="bg-white dark:bg-[#0F0F12] border border-white dark:border-[#1F1F23]">
      <CardHeader>
        <CardTitle>Log Types Distribution</CardTitle>
        <CardDescription>Breakdown of audit logs by action type</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px]">
          <Chart>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  cornerRadius={6}
                  dataKey="value"
                  label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''} ${percent ? (percent * 100).toFixed(0) : 0}%`}
                  labelLine={false}
                  stroke="none" // Remove the white outline
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>

                {/* Add total logs count in the center */}
                <Text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-gray-900 dark:fill-white font-bold"
                  fontSize={16}
                >
                  {totalLogs}
                </Text>
                <Text
                  x="50%"
                  y="50%"
                  dy={20}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-gray-500 dark:fill-gray-400"
                  fontSize={12}
                >
                  Total Logs
                </Text>

                <Legend layout="horizontal" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </Chart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
