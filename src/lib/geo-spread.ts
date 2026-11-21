import type { GeoConfig } from "@/types/geo-config";
import { getGeoInvalidRatio } from "@/types/geo-config";
import { distributeTotal } from "./buyers";
import { deriveDailyNoSend, hashString, spreadDailySeries } from "./period-spread";

export type DepositSchedule = "daily" | "alternate" | "random";

export interface GeoSpreadDay {
  leads: number;
  invalids: number;
  deposits: number;
  noSend: number;
  inactive: boolean;
}

function isWeekend(date: Date): boolean {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function isDepositDay(
  activeIndex: number,
  schedule: DepositSchedule,
  seed: string,
): boolean {
  if (schedule === "daily") return true;
  if (schedule === "alternate") return activeIndex % 2 === 0;
  const h = hashString(`${seed}:depday:${activeIndex}`) % 100;
  return h < 55;
}

function countActiveDays(dates: Date[], skipWeekends: boolean): number {
  return dates.filter((d) => !skipWeekends || !isWeekend(d)).length;
}

/**
 * Spread geo metrics across calendar dates with optional weekend skip and deposit schedule.
 * When periodLeads is set, daily base leads are NOT summed — only invalid % and «today» slot apply.
 */
export function spreadGeoDailySeries(
  dates: Date[],
  base: { leads: number; invalids: number; deposits: number; noSend?: number },
  seed: string,
  geo: GeoConfig,
  templateNoSend?: number,
): GeoSpreadDay[] {
  const skipWeekends = geo.skipWeekends ?? false;
  const depositSchedule = geo.depositSchedule ?? "daily";
  const crBasis = geo.crBasis ?? "leads";
  const invalidRatio = getGeoInvalidRatio(geo);

  const activeMask = dates.map((d) => !skipWeekends || !isWeekend(d));
  const activeCount = activeMask.filter(Boolean).length;
  const lastIdx = dates.length - 1;
  const lastIsActive = lastIdx >= 0 && activeMask[lastIdx];

  if (activeCount === 0) {
    return dates.map(() => ({
      leads: 0,
      invalids: 0,
      deposits: 0,
      noSend: 0,
      inactive: true,
    }));
  }

  let activeLeads: number[];

  if (geo.periodLeads != null && geo.periodLeads > 0) {
    const todaySlot =
      geo.todayLeads !== undefined ? geo.todayLeads : base.leads;
    const todayLeads = lastIsActive
      ? Math.min(geo.periodLeads, Math.max(0, todaySlot))
      : 0;
    const otherActive = activeCount - (lastIsActive ? 1 : 0);
    const remainder = Math.max(0, geo.periodLeads - todayLeads);
    const otherLeads =
      otherActive > 0
        ? distributeTotal(remainder, otherActive, `${seed}:pleads`)
        : [];

    let oi = 0;
    activeLeads = [];
    for (let i = 0; i < dates.length; i++) {
      if (!activeMask[i]) continue;
      if (i === lastIdx && lastIsActive) {
        activeLeads.push(todayLeads);
      } else {
        activeLeads.push(otherLeads[oi] ?? 0);
        oi += 1;
      }
    }
  } else {
    const leadSeries = spreadDailySeries(
      {
        leads: base.leads,
        invalids: base.invalids,
        deposits: 0,
        noSend: base.noSend,
      },
      activeCount,
      `${seed}:leads`,
    );
    activeLeads = leadSeries.map((d) => d.leads);
  }

  const activeInvalids = activeLeads.map((l) =>
    Math.min(l, Math.round(l * invalidRatio)),
  );

  let totalDeposits: number;
  if (geo.targetCr != null && geo.targetCr > 0) {
    const totalLeads = activeLeads.reduce((a, b) => a + b, 0);
    const totalValids = activeInvalids.reduce(
      (acc, inv, i) => acc + Math.max(0, activeLeads[i] - inv),
      0,
    );
    const crBase = crBasis === "valids" ? totalValids : totalLeads;
    totalDeposits = crBase > 0 ? Math.round((crBase * geo.targetCr) / 100) : 0;
  } else {
    const depSeries = spreadDailySeries(
      { leads: 0, invalids: 0, deposits: base.deposits, noSend: 0 },
      activeCount,
      `${seed}:deps`,
    );
    totalDeposits = depSeries.reduce((a, d) => a + d.deposits, 0);
  }

  const depositDayFlags = Array.from({ length: activeCount }, (_, i) =>
    isDepositDay(i, depositSchedule, seed),
  );
  let depositDayCount = depositDayFlags.filter(Boolean).length;
  if (depositDayCount === 0) depositDayCount = 1;

  const activeDeposits = distributeTotal(
    totalDeposits,
    depositDayCount,
    `${seed}:depdist`,
  );

  let depIdx = 0;
  let activeIdx = 0;
  const result: GeoSpreadDay[] = [];

  for (let i = 0; i < dates.length; i++) {
    if (!activeMask[i]) {
      result.push({
        leads: 0,
        invalids: 0,
        deposits: 0,
        noSend: 0,
        inactive: true,
      });
      continue;
    }

    const leads = activeLeads[activeIdx] ?? 0;
    let invalids = activeInvalids[activeIdx] ?? 0;
    let deposits = 0;

    const isDep = depositDayFlags[activeIdx];
    if (isDep) {
      deposits = activeDeposits[depIdx] ?? 0;
      depIdx += 1;
    }

    if (
      i === lastIdx &&
      lastIsActive &&
      geo.periodLeads != null &&
      geo.periodLeads > 0 &&
      geo.todayLeads === 0
    ) {
      invalids = geo.todayInvalids ?? 0;
      deposits = geo.todayDeposits ?? 0;
    } else if (
      i === lastIdx &&
      lastIsActive &&
      geo.periodLeads != null &&
      geo.periodLeads > 0 &&
      geo.todayDeposits != null
    ) {
      deposits = geo.todayDeposits;
    }

    if (
      i === lastIdx &&
      lastIsActive &&
      geo.periodLeads != null &&
      geo.periodLeads > 0 &&
      geo.todayLeads !== 0 &&
      geo.todayInvalids != null
    ) {
      invalids = Math.min(leads, geo.todayInvalids);
    }

    const noSend = deriveDailyNoSend(leads, `${seed}:ns-${i}`, templateNoSend);

    result.push({ leads, invalids, deposits, noSend, inactive: false });
    activeIdx += 1;
  }

  return result;
}

export function estimateAllGeosPeriod(
  geos: GeoConfig[],
  dates: Date[],
  baseNoSend?: number,
): { leads: number; invalids: number; deposits: number; activeDays: number } {
  let leads = 0;
  let invalids = 0;
  let deposits = 0;
  let activeDays = 0;

  for (const geo of geos) {
    const series = spreadGeoDailySeries(
      dates,
      {
        leads: geo.leads,
        invalids: geo.invalids,
        deposits: geo.deposits,
        noSend: baseNoSend,
      },
      `est-${geo.geo}`,
      geo,
      baseNoSend,
    );
    for (const day of series) {
      if (day.inactive) continue;
      activeDays += 1;
      leads += day.leads;
      invalids += day.invalids;
      deposits += day.deposits;
    }
  }

  return { leads, invalids, deposits, activeDays };
}

export function estimateGeoPeriodTotals(
  geo: GeoConfig,
  periodType: "day" | "week" | "month",
  anchorDate: Date,
  getDates: (anchor: Date, period: "day" | "week" | "month") => Date[],
): { leads: number; invalids: number; deposits: number; days: number; activeDays: number } {
  const dates = getDates(anchorDate, periodType);
  const series = spreadGeoDailySeries(
    dates,
    { leads: geo.leads, invalids: geo.invalids, deposits: geo.deposits },
    "estimate",
    geo,
  );
  return {
    days: dates.length,
    activeDays: series.filter((d) => !d.inactive).length,
    leads: series.reduce((a, d) => a + d.leads, 0),
    invalids: series.reduce((a, d) => a + d.invalids, 0),
    deposits: series.reduce((a, d) => a + d.deposits, 0),
  };
}

export { countActiveDays };
