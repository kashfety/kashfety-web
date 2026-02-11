"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTheme } from "next-themes"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts"
import { useLocale } from "@/components/providers/locale-provider"
import { toArabicNumerals } from "@/lib/i18n"

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
  const { t, locale, isRTL } = useLocale()

  // Day name translations
  const dayNames: Record<string, string> = {
    'Mon': locale === 'ar' ? 'الإثنين' : 'Mon',
    'Tue': locale === 'ar' ? 'الثلاثاء' : 'Tue',
    'Wed': locale === 'ar' ? 'الأربعاء' : 'Wed',
    'Thu': locale === 'ar' ? 'الخميس' : 'Thu',
    'Fri': locale === 'ar' ? 'الجمعة' : 'Fri',
    'Sat': locale === 'ar' ? 'السبت' : 'Sat',
    'Sun': locale === 'ar' ? 'الأحد' : 'Sun'
  }

  // Localize data with translated day names
  const localizedData = (data && data.length ? data : defaultData).map(item => ({
    ...item,
    name: dayNames[item.name] || item.name
  }))

  return (
    <Card className="border-0 shadow-xl shadow-emerald-500/5 gradient-card">
      <CardHeader dir={isRTL ? 'rtl' : 'ltr'}>
        <CardTitle className="text-left" dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_weekly_schedule') || 'Weekly Schedule'}</CardTitle>
        <CardDescription className="text-left" dir={isRTL ? 'rtl' : 'ltr'}>{t('dd_weekly_schedule_desc') || 'Your patient appointments this week'}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={localizedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                tickFormatter={(value) => locale === 'ar' ? toArabicNumerals(value.toString()) : `${value}`}
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
                formatter={(value: any) => locale === 'ar' ? toArabicNumerals(value.toString()) : value}
              />
              <Legend 
                formatter={(value) => value === 'patients' ? (t('dd_patients') || 'Patients') : value}
              />
              <Bar
                dataKey="patients"
                name={t('dd_patients') || 'Patients'}
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
