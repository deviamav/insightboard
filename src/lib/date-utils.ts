export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDaysISO(iso: string, delta: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

export function clampISODate(iso: string, min?: string, max?: string): string {
  if (min && iso < min) return min;
  if (max && iso > max) return max;
  return iso;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function weekdayIndex(iso: string): number {
  const d = parseISODate(iso);
  return (d.getDay() + 6) % 7;
}

/** Monday of the week containing `iso` (week starts Monday). */
export function mondayOfWeekISO(iso: string): string {
  return addDaysISO(iso, -weekdayIndex(iso));
}

export function startOfMonthISO(iso: string): string {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function previousMonthRangeISO(iso: string): { from: string; to: string } {
  const d = parseISODate(iso);
  return {
    from: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
    to: toISODate(new Date(d.getFullYear(), d.getMonth(), 0)),
  };
}
