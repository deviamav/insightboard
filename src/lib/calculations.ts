export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calcMetrics(leads: number, invalids: number, deposits: number) {
  const valids = Math.max(0, leads - invalids);
  const cr = calcCr(leads, valids, deposits, "leads");
  const invalidPercent = leads > 0 ? round2((invalids / leads) * 100) : 0;
  return { valids, cr, invalidPercent };
}

export function calcCr(
  leads: number,
  valids: number,
  deposits: number,
  basis: "leads" | "valids" = "leads",
): number {
  const base = basis === "valids" ? valids : leads;
  return base > 0 ? round2((deposits / base) * 100) : 0;
}

export function normalizePeriodDate(date: Date, _periodType: "day" | "week" | "month"): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function periodEndDate(start: Date, periodType: "day" | "week" | "month"): Date {
  const end = new Date(start);
  if (periodType === "day") return end;
  if (periodType === "week") {
    end.setDate(end.getDate() + 6);
    return end;
  }
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  return end;
}

export function periodsOverlap(
  entryStart: Date,
  entryType: "day" | "week" | "month",
  rangeFrom: Date,
  rangeTo: Date,
): boolean {
  const entryEnd = periodEndDate(entryStart, entryType);
  return entryStart <= rangeTo && entryEnd >= rangeFrom;
}
