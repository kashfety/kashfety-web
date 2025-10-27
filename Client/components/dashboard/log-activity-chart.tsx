"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Chart, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts"

const data = [
  { date: "Jan", logs: 120 },
  { date: "Feb", logs: 145 },
  { date: "Mar", logs: 132 },
  { date: "Apr", logs: 178 },
  { date: "May", logs: 190 },
  { date: "Jun", logs: 210 },
  { date: "Jul", logs: 252 },
  { date: "Aug", logs: 265 },
  { date: "Sep", logs: 280 },
  { date: "Oct", logs: 245 },
  { date: "Nov", logs: 290 },
  { date: "Dec", logs: 310 },
]

export default function LogActivityChart() {
  return (
    <Card className="bg-white dark:bg-[#0F0F12] border border-white dark:border-[#1F1F23]">
      <CardHeader>
        <CardTitle>Audit Log Activity</CardTitle>
        <CardDescription>Log frequency over the past year</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px]">
          <Chart>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data}
                margin={{
                  top: 10,
                  right: 30,
                  left: 0,
                  bottom: 0,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-sm text-muted-foreground" tickLine={false} axisLine={false} />
                <YAxis className="text-sm text-muted-foreground" tickLine={false} axisLine={false} />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <ChartTooltipContent>
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded-full bg-gray-500 dark:bg-gray-400" />
                              <span className="text-sm text-muted-foreground">{payload[0].payload.date}</span>
                            </div>
                            <div className="text-left font-bold">{payload[0].value} logs</div>
                          </div>
                        </ChartTooltipContent>
                      )
                    }
                    return null
                  }}
                />
                <Area type="monotone" dataKey="logs" stroke="hsl(var(--ring))" fill="#ffffff" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </Chart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
