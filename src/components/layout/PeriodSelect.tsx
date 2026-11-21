"use client";

import { useTranslations } from "next-intl";
import type { Period } from "@/types/stats";

interface PeriodSelectProps {
  value: Period;
  onChange: (period: Period) => void;
  accent: string;
  border: string;
  bgCard: string;
  text: string;
}

export function PeriodSelect({
  value,
  onChange,
  accent,
  border,
  bgCard,
  text,
}: PeriodSelectProps) {
  const t = useTranslations("period");
  const periods: Period[] = [
    "today",
    "yesterday",
    "week",
    "lastWeek",
    "month",
    "lastMonth",
    "custom",
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Period)}
      className="h-8 rounded-lg border px-2.5 text-[13px] outline-none transition-colors hover:border-white/[0.16]"
      style={{
        backgroundColor: bgCard,
        borderColor: border,
        color: text,
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = accent)}
      onBlur={(e) => (e.currentTarget.style.borderColor = border)}
    >
      {periods.map((p) => (
        <option key={p} value={p}>
          {t(p)}
        </option>
      ))}
    </select>
  );
}
