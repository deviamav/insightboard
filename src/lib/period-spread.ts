import type { PeriodType } from "@/types/stats";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function todayStart(): Date {
  return startOfDay(new Date());
}

export function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function getSpreadDayCount(periodType: PeriodType): number {
  if (periodType === "week") return 7;
  if (periodType === "month") return 30;
  return 1;
}

/** Dates ending on anchor or today (whichever is later). */
export function getSpreadDates(anchorDate: Date, periodType: PeriodType): Date[] {
  const anchor = startOfDay(anchorDate);
  const today = todayStart();
  const end = anchor > today ? anchor : today;
  const count = getSpreadDayCount(periodType);

  return Array.from({ length: count }, (_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() - (count - 1 - i));
    return d;
  });
}

function daySwingPct(seed: string, maxPct: number): number {
  const h = hashString(seed) % 201;
  return ((h - 100) / 100) * maxPct;
}

/** ~0.6–2% of daily leads, with per-geo/day jitter. */
export function deriveDailyNoSend(
  leads: number,
  seed: string,
  override?: number,
): number {
  if (override != null && override > 0) return override;
  if (leads <= 0) return 0;
  const h = hashString(`${seed}:nosend`) % 100;
  const pct = 0.006 + (h / 100) * 0.014;
  const value = Math.round(leads * pct);
  if (value > 0) return value;
  return leads >= 80 ? 1 : 0;
}

function buildMultiplierWalk(dayCount: number, seed: string, maxPct: number): number[] {
  const mults = [1];
  for (let i = 1; i < dayCount; i++) {
    mults.push(mults[i - 1] * (1 + daySwingPct(`${seed}:${i}`, maxPct)));
  }
  return mults;
}

export type SpreadDailyOptions = {
  /** Day-over-day swing for leads (default ~3.5%). */
  leadMaxPct?: number;
  /** Day-over-day swing for deposits / conversion (default ~1.75%). */
  conversionMaxPct?: number;
};

const DEFAULT_LEAD_MAX_PCT = 0.035;
const DEFAULT_CONVERSION_MAX_PCT = 0.0175;

/**
 * Build per-day metrics from daily base values (anchor day = last day = exact base).
 * Leads drift ±leadMaxPct per day; deposits drift ±conversionMaxPct (CR floats slower).
 */
export function spreadDailySeries(
  base: { leads: number; invalids: number; deposits: number; noSend?: number },
  dayCount: number,
  seed: string,
  options: SpreadDailyOptions = {},
): Array<{ leads: number; invalids: number; deposits: number; noSend: number }> {
  const leadMaxPct = options.leadMaxPct ?? DEFAULT_LEAD_MAX_PCT;
  const conversionMaxPct = options.conversionMaxPct ?? DEFAULT_CONVERSION_MAX_PCT;

  const baseNoSend = deriveDailyNoSend(base.leads, seed, base.noSend);
  if (dayCount <= 1) {
    return [{ ...base, noSend: baseNoSend }];
  }

  const depMults = buildMultiplierWalk(dayCount, `${seed}:dep`, conversionMaxPct);
  const leadMults = buildMultiplierWalk(dayCount, `${seed}:lead`, leadMaxPct);
  const invMults = buildMultiplierWalk(dayCount, `${seed}:inv`, leadMaxPct);
  const noSendMults = buildMultiplierWalk(dayCount, `${seed}:nosend`, leadMaxPct);

  const anchorDep = depMults[dayCount - 1];
  const anchorLead = leadMults[dayCount - 1];
  const anchorInv = invMults[dayCount - 1];
  const anchorNoSend = noSendMults[dayCount - 1];
  const baseInvalidRatio = base.leads > 0 ? base.invalids / base.leads : 0;

  return depMults.map((depMult, i) => {
    const leads = Math.max(
      0,
      Math.round((base.leads * leadMults[i]) / anchorLead),
    );
    const deposits = Math.max(
      0,
      Math.round((base.deposits * depMult) / anchorDep),
    );
    const invalidRatio = baseInvalidRatio * (invMults[i] / anchorInv);
    const invalids = Math.min(leads, Math.round(leads * invalidRatio));
    const noSend = Math.min(
      leads,
      Math.max(0, Math.round((baseNoSend * noSendMults[i]) / anchorNoSend)),
    );

    return { leads, invalids, deposits, noSend };
  });
}

export function estimatePeriodTotals(
  geos: Array<{ leads: number; invalids: number; deposits: number }>,
  periodType: PeriodType,
): { leads: number; invalids: number; deposits: number; days: number } {
  const days = getSpreadDayCount(periodType);
  return {
    days,
    leads: geos.reduce((s, g) => s + g.leads * days, 0),
    invalids: geos.reduce((s, g) => s + g.invalids * days, 0),
    deposits: geos.reduce((s, g) => s + g.deposits * days, 0),
  };
}
