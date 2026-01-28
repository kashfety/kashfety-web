"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker, MonthCaptionProps, useDayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

// Custom MonthCaption component to place nav buttons next to the month name
function CustomMonthCaption(props: MonthCaptionProps) {
  const { calendarMonth, displayIndex } = props
  const { goToMonth, previousMonth, nextMonth } = useDayPicker()
  
  const monthDate = calendarMonth.year
    ? new Date(calendarMonth.year, calendarMonth.month)
    : new Date()
  
  return (
    <div className="flex justify-between items-center pt-1 relative mb-4 px-1 w-full">
      <button
        type="button"
        onClick={() => previousMonth && goToMonth(previousMonth)}
        disabled={!previousMonth}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-[#4DBCC4]/20 hover:text-[#4DBCC4] hover:border-[#4DBCC4]/30 dark:hover:bg-[#4DBCC4]/20 dark:hover:text-[#4DBCC4] border-gray-300 dark:border-gray-600 flex-shrink-0 transition-all duration-200",
          !previousMonth && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-current hover:border-gray-300 dark:hover:border-gray-600"
        )}
        aria-label="Go to previous month"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      
      <div className="text-lg font-bold text-gray-900 dark:text-gray-100 flex-1 text-center">
        {monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
      </div>
      
      <button
        type="button"
        onClick={() => nextMonth && goToMonth(nextMonth)}
        disabled={!nextMonth}
        className={cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 bg-transparent p-0 opacity-50 hover:opacity-100 hover:bg-[#4DBCC4]/20 hover:text-[#4DBCC4] hover:border-[#4DBCC4]/30 dark:hover:bg-[#4DBCC4]/20 dark:hover:text-[#4DBCC4] border-gray-300 dark:border-gray-600 flex-shrink-0 transition-all duration-200",
          !nextMonth && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-current hover:border-gray-300 dark:hover:border-gray-600"
        )}
        aria-label="Go to next month"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
        month: "space-y-4 w-full",
        caption: "hidden",
        caption_label: "hidden",
        nav: "hidden",
        nav_button: "hidden",
        nav_button_previous: "hidden",
        nav_button_next: "hidden",
        month_grid: "w-full",
        weekdays: "",
        weekday: "",
        weeks: "",
        week: "",
        day: "",
        day_range_end: "day-range-end",
        day_selected: "",
        day_today: "",
        day_outside: "",
        day_disabled: "",
        day_range_middle: "",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        MonthCaption: CustomMonthCaption,
        IconLeft: ({ ...props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
