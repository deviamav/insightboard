export interface GeoConfig {
  geo: string;
  geoLabel?: string | null;
  /** Typical daily base for period spread (other days). */
  leads: number;
  invalids: number;
  deposits: number;
  buyerCount?: number;
  /** Anchor day (today) — overrides spread on the last generated day. */
  todayLeads?: number;
  todayInvalids?: number;
  todayDeposits?: number;
  /** Skip Saturday/Sunday for this geo. */
  skipWeekends?: boolean;
  /** How often deposits appear on active days. */
  depositSchedule?: "daily" | "alternate" | "random";
  /** Target CR % for period — overrides daily deposits when set. */
  targetCr?: number;
  /** CR basis for targetCr and stats. */
  crBasis?: "leads" | "valids";
  /** Total leads target for the period (optional). */
  periodLeads?: number;
}

export function createEmptyGeoRow(): GeoConfig {
  return {
    geo: "",
    geoLabel: null,
    leads: 0,
    invalids: 0,
    deposits: 0,
    buyerCount: 5,
  };
}

export function isGeoRowConfigured(g: GeoConfig): boolean {
  return g.geo.trim().length >= 2;
}

/** Invalid share for spread: ratio from base, or % when leads=0 and periodLeads set. */
export function getGeoInvalidRatio(g: GeoConfig): number {
  if (g.leads > 0) return Math.min(1, g.invalids / g.leads);
  if (g.periodLeads != null && g.periodLeads > 0 && g.invalids > 0) {
    return Math.min(1, g.invalids / 100);
  }
  return 0;
}

export function serializeGeoForApi(g: GeoConfig, normalizeGeo: (s: string) => string): GeoConfig {
  const row: GeoConfig = {
    geo: normalizeGeo(g.geo),
    geoLabel: g.geoLabel?.trim() || null,
    leads: g.leads,
    invalids: g.invalids,
    deposits: g.deposits,
    buyerCount: g.buyerCount ?? 5,
    skipWeekends: g.skipWeekends ?? false,
    depositSchedule: g.depositSchedule ?? "daily",
    crBasis: g.crBasis ?? "leads",
  };
  if (g.todayLeads !== undefined) row.todayLeads = g.todayLeads;
  if (g.todayInvalids !== undefined) row.todayInvalids = g.todayInvalids;
  if (g.todayDeposits !== undefined) row.todayDeposits = g.todayDeposits;
  if (g.todayLeads === 0) {
    row.todayInvalids = g.todayInvalids ?? 0;
    row.todayDeposits = g.todayDeposits ?? 0;
  }
  if (g.targetCr != null && g.targetCr > 0) row.targetCr = g.targetCr;
  if (g.periodLeads != null && g.periodLeads > 0) row.periodLeads = g.periodLeads;
  return row;
}

export function validateGeoRow(g: GeoConfig): boolean {
  if (!isGeoRowConfigured(g)) return false;
  if (g.periodLeads != null && g.periodLeads > 0) {
    if (g.leads === 0) return g.invalids >= 0 && g.invalids <= 100;
    return g.invalids <= g.leads;
  }
  return g.invalids <= g.leads;
}

export function validateGeoToday(g: GeoConfig): boolean {
  const m = getGeoTodayMetrics(g);
  if (g.periodLeads != null && g.periodLeads > 0 && m.leads === 0) {
    return m.invalids >= 0 && m.invalids <= 100;
  }
  return m.invalids <= m.leads;
}

export function getGeoTodayMetrics(g: GeoConfig) {
  if (g.todayLeads === 0) {
    return {
      leads: 0,
      invalids: g.todayInvalids ?? 0,
      deposits: g.todayDeposits ?? 0,
    };
  }
  return {
    leads: g.todayLeads ?? g.leads,
    invalids: g.todayInvalids ?? g.invalids,
    deposits: g.todayDeposits ?? g.deposits,
  };
}

export function zeroTodayMetrics(): Pick<
  GeoConfig,
  "todayLeads" | "todayInvalids" | "todayDeposits"
> {
  return { todayLeads: 0, todayInvalids: 0, todayDeposits: 0 };
}
