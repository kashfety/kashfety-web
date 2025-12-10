import type React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"
import { toArabicNumerals } from "@/lib/i18n"
import { useLocale } from "@/components/providers/locale-provider"

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
  const { locale, isRTL } = useLocale();
  
  // Convert value to Arabic numerals if locale is Arabic
  const displayValue = locale === 'ar' ? toArabicNumerals(value, locale) : value;
  const displayTrend = trend ? (locale === 'ar' ? toArabicNumerals(trend.value.toString(), locale) : trend.value.toString()) : null;

  return (
    <Card className={cn("overflow-hidden border-0 shadow-xl shadow-emerald-500/5", className)} dir={isRTL ? 'rtl' : 'ltr'}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-semibold text-gray-600 dark:text-gray-300" dir={isRTL ? 'rtl' : 'ltr'}>{title}</CardTitle>
        <div className="p-2.5 rounded-xl gradient-emerald-soft dark:bg-emerald-950/50">
          <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-3xl font-bold text-gray-900 dark:text-white" dir="ltr">{displayValue}</div>

        {trend && (
          <div className="flex items-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                trend.isPositive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
              )}
            >
              {trend.isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span dir="ltr">{displayTrend}%</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">vs last month</span>
          </div>
        )}

        {description && <p className="text-sm text-gray-500 dark:text-gray-400" dir={isRTL ? 'rtl' : 'ltr'}>{description}</p>}
      </CardContent>
    </Card>
  )
}
