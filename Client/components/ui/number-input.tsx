"use client";

import * as React from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { toArabicNumerals } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export interface NumberInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value?: number | string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}

const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ className, value = "", onChange, placeholder, dir, ...props }, ref) => {
    const { locale } = useLocale();
    const isArabic = locale === "ar";
    const inputRef = React.useRef<HTMLInputElement>(null);

    const valueStr = value === "" || value === undefined ? "" : String(value);
    const displayValue = isArabic
      ? (valueStr ? toArabicNumerals(valueStr, locale) : (placeholder ? toArabicNumerals(placeholder, locale) : "٠"))
      : valueStr;

    const mergedRef = (el: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
    };

    if (!isArabic) {
      return (
        <input
          type="number"
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
        {/* RTL: justify-start = numbers on the right */}
        <div
          aria-hidden
          className={cn(
            "flex h-10 min-h-10 w-full rounded-md px-3 py-2 text-base md:text-sm pointer-events-none absolute inset-0 items-center justify-start bg-background",
            isEmpty ? "text-muted-foreground" : "text-foreground"
          )}
          dir="rtl"
        >
          <span className="shrink-0 w-full text-right" dir="rtl" style={{ textAlign: "right" }}>
            {displayValue}
          </span>
        </div>
        <input
          type="number"
          ref={mergedRef}
          value={valueStr}
          onChange={onChange}
          dir="rtl"
          placeholder={placeholder}
          className={cn(
            "h-10 min-h-10 w-full rounded-md border-0 bg-transparent px-3 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm absolute inset-0 text-transparent caret-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
NumberInput.displayName = "NumberInput";

export { NumberInput };
