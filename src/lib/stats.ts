import { isBuyerOfferName } from "./geo-presets";
import { prisma } from "./prisma";
import { getActiveGeoCodes } from "./templates";
import { calcCr, calcMetrics, periodsOverlap } from "./calculations";
import { getPresetRange } from "./date-range";
import { todayISO } from "./date-utils";
import type { OfferRow, Period, StatsFilters } from "@/types/stats";

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function getDateRange(period: Period, anchorDate?: string): { from: Date; to: Date } {
  const endIso = anchorDate ?? todayISO();
  const { dateFrom, dateTo } = getPresetRange(period, endIso);
  return {
    from: startOfDay(new Date(dateFrom)),
    to: endOfDay(new Date(dateTo)),
  };
}

export function resolveStatsDateRange(filters: StatsFilters): { from: Date; to: Date } {
  if (filters.dateFrom && filters.dateTo) {
    const fromIso =
      filters.dateFrom <= filters.dateTo ? filters.dateFrom : filters.dateTo;
    const toIso =
      filters.dateFrom <= filters.dateTo ? filters.dateTo : filters.dateFrom;
    return {
      from: startOfDay(new Date(fromIso)),
      to: endOfDay(new Date(toIso)),
    };
  }

  if (filters.period) {
    return getDateRange(filters.period, filters.date);
  }

  const today = startOfDay(new Date());
  return { from: today, to: endOfDay(today) };
}

function filterRowsByRange<T extends { date: Date; periodType: string }>(
  rows: T[],
  from: Date,
  to: Date,
): T[] {
  return rows.filter((r) =>
    periodsOverlap(
      startOfDay(r.date),
      r.periodType as "day" | "week" | "month",
      from,
      to,
    ),
  );
}

function filterByGeo<T extends { geo: string }>(rows: T[], geo?: string): T[] {
  if (!geo || geo === "ALL") return rows;
  return rows.filter((r) => r.geo === geo);
}

function isMainRow(r: { offerName: string }) {
  return r.offerName === "";
}

function isHourlyRow(r: { offerName: string }) {
  return r.offerName.startsWith("__hour_");
}

function isOfferRow(r: { offerName: string }) {
  return r.offerName !== "" && !r.offerName.startsWith("__");
}

function filterByActiveGeos<T extends { geo: string }>(
  rows: T[],
  activeGeoCodes: string[],
): T[] {
  if (activeGeoCodes.length === 0) return [];
  const allowed = new Set(activeGeoCodes);
  return rows.filter((r) => allowed.has(r.geo.toUpperCase()));
}

function buildAggregated(
  rows: Awaited<ReturnType<typeof fetchAllStats>>,
  activeGeoCodes: string[] = [],
  crBasis: "leads" | "valids" = "leads",
) {
  const mainRows = rows.filter(isMainRow);
  const hourlyRows = rows.filter(isHourlyRow);

  const totals = mainRows.reduce(
    (acc, r) => ({
      leads: acc.leads + r.leads,
      valids: acc.valids + r.valids,
      invalids: acc.invalids + r.invalids,
      deposits: acc.deposits + r.deposits,
      profit: acc.profit + Number(r.profit),
    }),
    { leads: 0, valids: 0, invalids: 0, deposits: 0, profit: 0 },
  );

  const { cr } = {
    cr: calcCr(totals.leads, totals.valids, totals.deposits, crBasis),
  };

  const geoMap = new Map<
    string,
    { total: number; valid: number; invalid: number; deposit: number }
  >();

  for (const r of mainRows) {
    const g = geoMap.get(r.geo) ?? {
      total: 0,
      valid: 0,
      invalid: 0,
      deposit: 0,
    };
    g.total += r.leads;
    g.valid += r.valids;
    g.invalid += r.invalids;
    g.deposit += r.deposits;
    geoMap.set(r.geo, g);
  }

  const buyerMap = new Map<
    string,
    { leads: number; deposits: number; geo: string }
  >();

  for (const r of rows) {
    if (!isBuyerOfferName(r.offerName) || !r.buyerName) continue;
    const key = `${r.buyerName}::${r.geo}`;
    const b = buyerMap.get(key) ?? {
      leads: 0,
      deposits: 0,
      geo: r.geo,
    };
    b.leads += r.leads;
    b.deposits += r.deposits;
    buyerMap.set(key, b);
  }

  const topBuyers = [...buyerMap.entries()]
    .map(([key, data]) => {
      const name = key.split("::")[0];
      return {
        name,
        geo: data.geo,
        leads: data.leads,
        deposits: data.deposits,
        conversion: calcCr(data.leads, data.leads, data.deposits, crBasis),
      };
    })
    .sort((a, b) => b.deposits - a.deposits)
    .slice(0, 10);

  const hourlyMap = new Map<number, { leads: number; deposits: number }>();
  for (let h = 0; h < 24; h++) hourlyMap.set(h, { leads: 0, deposits: 0 });

  for (const r of hourlyRows) {
    if (r.hour == null) continue;
    const h = hourlyMap.get(r.hour)!;
    h.leads += r.leads;
    h.deposits += r.deposits;
  }

  const hourlyChart = [...hourlyMap.entries()].map(([hour, data]) => ({
    hour: `${hour.toString().padStart(2, "0")}:00`,
    leads: data.leads,
    deposits: data.deposits,
    duplicates: Math.max(0, Math.floor(data.leads * 0.09)),
  }));

  const qualityTotal = totals.leads;
  const invalidPct =
    qualityTotal > 0
      ? Math.round((totals.invalids / qualityTotal) * 100)
      : 0;
  const validPct =
    qualityTotal > 0 ? Math.round((totals.valids / qualityTotal) * 100) : 0;
  const ftdPct =
    qualityTotal > 0
      ? Math.round((totals.deposits / qualityTotal) * 100)
      : 0;

  const qualityChart = [
    { name: "valid", value: totals.valids, percent: validPct },
    { name: "invalid", value: totals.invalids, percent: invalidPct },
    { name: "ftd", value: totals.deposits, percent: ftdPct },
  ];

  return {
    totals: { ...totals, cr, profit: totals.profit },
    geo:
      activeGeoCodes.length > 0
        ? activeGeoCodes.map((code) => ({
            code,
            ...(geoMap.get(code) ?? {
              total: 0,
              valid: 0,
              invalid: 0,
              deposit: 0,
            }),
          }))
        : [...geoMap.entries()].map(([code, data]) => ({ code, ...data })),
    topBuyers,
    hourlyChart,
    qualityChart,
    qualityTotal,
  };
}

async function fetchAllStats() {
  return prisma.dailyStat.findMany({ orderBy: { date: "asc" } });
}

export async function getAggregatedStats(filters: StatsFilters) {
  const activeGeoCodes = await getActiveGeoCodes();
  const crBasis = filters.crBasis ?? "leads";
  const { from, to } = resolveStatsDateRange(filters);
  const all = await fetchAllStats();
  const ranged = filterRowsByRange(all, from, to);
  const geoFiltered = filterByGeo(ranged, filters.geo);
  const rows = filterByActiveGeos(geoFiltered, activeGeoCodes);
  return buildAggregated(rows, activeGeoCodes, crBasis);
}

export async function getOffersAnalytics(filters: StatsFilters): Promise<OfferRow[]> {
  const activeGeoCodes = await getActiveGeoCodes();
  const crBasis = filters.crBasis ?? "leads";
  const { from, to } = resolveStatsDateRange(filters);
  const all = await fetchAllStats();
  const ranged = filterRowsByRange(all, from, to);
  const geoFiltered = filterByGeo(ranged, filters.geo);
  const rows = filterByActiveGeos(geoFiltered, activeGeoCodes);

  const offerMap = new Map<
    string,
    {
      leads: number;
      valids: number;
      invalids: number;
      noSend: number;
      deposits: number;
    }
  >();

  for (const r of rows) {
    if (!isOfferRow(r) && !isMainRow(r)) continue;
    const key = r.offerName || "TOTAL";
    const o = offerMap.get(key) ?? {
      leads: 0,
      valids: 0,
      invalids: 0,
      noSend: 0,
      deposits: 0,
    };
    o.leads += r.leads;
    o.valids += r.valids;
    o.invalids += r.invalids;
    o.noSend += r.noSend;
    o.deposits += r.deposits;
    offerMap.set(key, o);
  }

  return [...offerMap.entries()]
    .map(([name, data]) => {
      const m = calcMetrics(data.leads, data.invalids, data.deposits);
      return {
        name,
        total: data.leads,
        valid: data.valids,
        invalid: data.invalids,
        noSend: data.noSend,
        invalidPercent: m.invalidPercent,
        deposits: data.deposits,
        conversion: calcCr(data.leads, data.valids, data.deposits, crBasis),
      };
    })
    .sort((a, b) => {
      if (a.name === "TOTAL") return -1;
      if (b.name === "TOTAL") return 1;
      return b.total - a.total;
    });
}
