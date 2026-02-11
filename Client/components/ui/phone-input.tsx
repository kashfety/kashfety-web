"use client";

import * as React from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { toArabicNumerals, toWesternNumerals } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

function formatPhoneForDisplay(phone: string, locale: "en" | "ar"): string {
  if (!phone) return "";
  if (locale !== "ar") return phone;
  return toArabicNumerals(phone, "ar");
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, placeholder, dir, ...props }, ref) => {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const inputRef = React.useRef<HTMLInputElement>(null);

    const valueStr = value === undefined || value === null ? "" : String(value);
    const displayValue = isArabic
      ? formatPhoneForDisplay(valueStr, "ar")
      : valueStr;
    const displayPlaceholder = isArabic && placeholder
      ? toArabicNumerals(placeholder, "ar")
      : placeholder;

    const mergedRef = (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onChange) return;
      const raw = e.target.value;
      const western = toWesternNumerals(raw);
      const synthetic = {
        ...e,
        target: { ...e.target, value: western },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(synthetic);
    };

    if (!isArabic) {
      return (
        <input
          type="tel"
          ref={mergedRef}
          value={valueStr}
          onChange={onChange}
          dir="ltr"
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm text-left",
            className
          )}
          {...props}
        />
      );
    }

    const isEmpty = valueStr === "";

    return (
      <div className="relative w-full min-h-10 h-10 rounded-md border border-input bg-background shadow-sm overflow-visible box-border focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
        <div
          aria-hidden
          className={cn(
            "flex h-10 min-h-10 w-full rounded-md px-3 py-2 text-base md:text-sm pointer-events-none absolute inset-0 items-center justify-start bg-background",
            isEmpty ? "text-muted-foreground" : "text-foreground"
          )}
          dir="rtl"
        >
          <span className="shrink-0 w-full text-right" dir="rtl" style={{ textAlign: "right" }}>
            {displayValue || displayPlaceholder}
          </span>
        </div>
        <input
          type="tel"
          inputMode="numeric"
          ref={mergedRef}
          value={valueStr}
          onChange={handleChange}
          dir="rtl"
          placeholder=""
          aria-placeholder={placeholder ?? undefined}
          className={cn(
            "h-10 min-h-10 w-full rounded-md border-0 bg-transparent px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm absolute inset-0 text-transparent caret-transparent",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
