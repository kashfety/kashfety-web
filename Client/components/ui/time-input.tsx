"use client";

import * as React from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { toArabicNumerals } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const HIDE_TIME_ICON =
  "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer";

const TIME_PLACEHOLDER_AR = "٠٠:٠٠"; // Arabic numeral placeholder for empty time

export interface TimeInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const TimeInput = React.forwardRef<HTMLInputElement, TimeInputProps>(
  ({ className, value = "", onChange, dir, ...props }, ref) => {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const inputRef = React.useRef<HTMLInputElement>(null);

    const displayValue = isArabic
      ? (value ? toArabicNumerals(value, locale) : TIME_PLACEHOLDER_AR)
      : value;

    const mergedRef = (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    };

    if (!isArabic) {
      return (
        <input
          type="time"
          ref={mergedRef}
          value={value}
          onChange={onChange}
          dir="ltr"
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-left",
            HIDE_TIME_ICON,
            className
          )}
          {...props}
        />
      );
    }

    return (
      <div className="relative w-full min-h-10 h-10 rounded-md border border-input bg-background shadow-sm overflow-visible box-border focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        {/* RTL + Arabic numerals, no clock icon */}
        <div
          aria-hidden
          className={cn(
            "flex h-10 min-h-10 w-full rounded-md px-3 py-2 text-base md:text-sm pointer-events-none absolute inset-0 items-center justify-start bg-background",
            value ? "text-foreground" : "text-muted-foreground"
          )}
          dir="rtl"
        >
          <span className="shrink-0 w-full text-right" dir="rtl" style={{ textAlign: "right" }}>
            {displayValue}
          </span>
        </div>
        <input
          type="time"
          ref={mergedRef}
          value={value}
          onChange={onChange}
          dir="rtl"
          className={cn(
            "h-10 min-h-10 w-full rounded-md border-0 bg-transparent px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm cursor-pointer text-transparent caret-transparent absolute inset-0",
            HIDE_TIME_ICON,
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
TimeInput.displayName = "TimeInput";

export { TimeInput };
