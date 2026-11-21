"use client";

import { useTranslations } from "next-intl";
import { DatePicker } from "./DatePicker";

interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (date: string) => void;
  onDateToChange: (date: string) => void;
  min?: string;
  max?: string;
}

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  min,
  max,
}: DateRangeFilterProps) {
  const t = useTranslations("filters");

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <DatePicker
        value={dateFrom}
        onChange={onDateFromChange}
        min={min}
        max={max}
        showNav={false}
      />
      <span
        className="px-0.5 text-xs font-medium"
        style={{ color: "var(--theme-text-muted)" }}
        aria-hidden
      >
        {t("dateRangeSeparator")}
      </span>
      <DatePicker
        value={dateTo}
        onChange={onDateToChange}
        min={min}
        max={max}
        showNav={false}
      />
    </div>
  );
}
