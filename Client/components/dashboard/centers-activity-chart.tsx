"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chart, ChartContainer, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useLocale } from "@/components/providers/locale-provider"

const data = [
  { name: "Center A", students: 120, classes: 45 },
  { name: "Center B", students: 98, classes: 38 },
  { name: "Center C", students: 86, classes: 30 },
  { name: "Center D", students: 99, classes: 35 },
  { name: "Center E", students: 85, classes: 28 },
  { name: "Center F", students: 65, classes: 22 },
]

export default function CentersActivityChart() {
  const { t } = useLocale()
  
  return (
    <Card className="bg-white dark:bg-[#0F0F12] border border-white dark:border-[#1F1F23]">
      <CardHeader>
        <CardTitle>{t("centers_activity")}</CardTitle>
        <CardDescription>{t("students_and_classes")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px]">
          <Chart>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-sm text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis className="text-sm text-muted-foreground" tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload }: { active?: boolean; payload?: any[] }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent>
                          <div className="flex flex-col gap-2">
                            <div className="text-sm font-medium">{payload[0].payload.name}</div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-gray-700 dark:bg-gray-300" />
                              <span className="text-sm text-muted-foreground">{t("students_label")}: {payload[0].value}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-gray-400 dark:bg-gray-600" />
                              <span className="text-sm text-muted-foreground">{t("classes_label")}: {payload[1].value}</span>
                            </div>
                          </div>
                        </ChartTooltipContent>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="students" fill="hsl(var(--ring))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="classes" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
