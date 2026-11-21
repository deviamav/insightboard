"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDaysISO,
  clampISODate,
  daysInMonth,
  parseISODate,
  toISODate,
  todayISO,
  weekdayIndex,
} from "@/lib/date-utils";

interface DatePickerProps {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  max?: string;
  showNav?: boolean;
}

export function DatePicker({ value, onChange, min, max, showNav = true }: DatePickerProps) {
  const locale = useLocale();
  const t = useTranslations("filters");
  const tPeriod = useTranslations("period");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value || todayISO();
  const today = todayISO();

  const [viewYear, setViewYear] = useState(() => parseISODate(selected).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => parseISODate(selected).getMonth());

  const displayLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(parseISODate(selected));
  }, [locale, selected]);

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 1);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
    });
  }, [locale]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(
      new Date(viewYear, viewMonth, 1),
    );
  }, [locale, viewYear, viewMonth]);

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const leading = weekdayIndex(toISODate(first));
    const total = daysInMonth(viewYear, viewMonth);
    const cells: Array<{ iso: string; inMonth: boolean }> = [];

    for (let i = 0; i < leading; i++) {
      const d = new Date(viewYear, viewMonth, 1 - (leading - i));
      cells.push({ iso: toISODate(d), inMonth: false });
    }
    for (let day = 1; day <= total; day++) {
      cells.push({ iso: toISODate(new Date(viewYear, viewMonth, day)), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const last = parseISODate(cells[cells.length - 1].iso);
      last.setDate(last.getDate() + 1);
      cells.push({ iso: toISODate(last), inMonth: false });
    }
    return cells;
  }, [viewYear, viewMonth]);

  function pick(iso: string) {
    onChange(clampISODate(iso, min, max));
    setOpen(false);
  }

  function shiftDay(delta: number) {
    onChange(clampISODate(addDaysISO(selected, delta), min, max));
  }

  function shiftMonth(delta: number) {
    const d = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const canBack = !min || addDaysISO(selected, -1) >= min;
  const canForward = !max || addDaysISO(selected, 1) <= max;
  const canPickToday = (!min || today >= min) && (!max || today <= max);

  useEffect(() => {
    if (!open) return;
    const d = parseISODate(selected);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [open, selected]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function isDisabled(iso: string) {
    return (min !== undefined && iso < min) || (max !== undefined && iso > max);
  }

  return (
    <div ref={ref} className="relative flex items-center gap-1">
      {showNav && (
        <button
          type="button"
          onClick={() => shiftDay(-1)}
          disabled={!canBack}
          className="rounded-lg border p-2 transition-opacity disabled:opacity-30"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-bg-card)",
            color: "var(--theme-text-muted)",
          }}
          aria-label={t("prevDay")}
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-w-[10.5rem] items-center gap-2 rounded-lg border px-3 py-2 text-sm"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-bg-card)",
          color: "var(--theme-text)",
        }}
      >
        <Calendar size={15} style={{ color: "var(--theme-text-muted)" }} />
        <span className="truncate">{displayLabel}</span>
      </button>

      {showNav && (
        <button
          type="button"
          onClick={() => shiftDay(1)}
          disabled={!canForward}
          className="rounded-lg border p-2 transition-opacity disabled:opacity-30"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-bg-card)",
            color: "var(--theme-text-muted)",
          }}
          aria-label={t("nextDay")}
        >
          <ChevronRight size={16} />
        </button>
      )}

      {showNav && canPickToday && selected !== today && (
        <button
          type="button"
          onClick={() => pick(today)}
          className="hidden rounded-lg border px-2.5 py-2 text-xs font-medium sm:block"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-bg-card)",
            color: "var(--theme-accent)",
          }}
        >
          {tPeriod("today")}
        </button>
      )}

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-2 w-[17.5rem] rounded-xl border p-3 shadow-xl"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-bg-card)",
          }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="rounded-md p-1"
              style={{ color: "var(--theme-text-muted)" }}
              aria-label={t("prevMonth")}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium capitalize">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="rounded-md p-1"
              style={{ color: "var(--theme-text-muted)" }}
              aria-label={t("nextMonth")}
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {weekdays.map((wd) => (
              <div
                key={wd}
                className="py-1 text-center text-[10px] font-medium uppercase"
                style={{ color: "var(--theme-text-muted)" }}
              >
                {wd}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {calendarDays.map(({ iso, inMonth }) => {
              const disabled = isDisabled(iso);
              const isSelected = iso === selected;
              const isToday = iso === today;

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => pick(iso)}
                  className="aspect-square rounded-md text-xs tabular-nums transition-colors disabled:opacity-25"
                  style={{
                    color: inMonth ? "var(--theme-text)" : "var(--theme-text-muted)",
                    backgroundColor: isSelected
                      ? "var(--theme-accent)"
                      : isToday
                        ? "color-mix(in srgb, var(--theme-accent) 12%, transparent)"
                        : "transparent",
                    fontWeight: isSelected || isToday ? 600 : 400,
                    ...(isSelected ? { color: "#fff" } : {}),
                  }}
                >
                  {parseISODate(iso).getDate()}
                </button>
              );
            })}
          </div>

          {canPickToday && (
            <button
              type="button"
              onClick={() => pick(today)}
              className="mt-3 w-full rounded-lg border py-1.5 text-xs font-medium sm:hidden"
              style={{
                borderColor: "var(--theme-border)",
                color: "var(--theme-accent)",
              }}
            >
              {tPeriod("today")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
