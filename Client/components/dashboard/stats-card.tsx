import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string
  icon: React.ElementType
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export default function StatsCard({ title, value, icon: Icon, description, trend, className }: StatsCardProps) {
  return (
    <Card className={cn("overflow-hidden border-0 shadow-xl shadow-emerald-500/5", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300">{title}</CardTitle>
        <div className="p-2.5 rounded-xl gradient-emerald-soft dark:bg-emerald-950/50">
          <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold text-gray-900 dark:text-white">{value}</div>

        {trend && (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                trend.isPositive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
              )}
            >
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}%
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
          </div>
        )}

        {description && <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>}
      </CardContent>
    </Card>
  )
}
