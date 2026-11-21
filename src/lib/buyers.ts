import type { GeoConfig } from "@/types/geo-config";
import { getGeoTodayMetrics } from "@/types/geo-config";
import type { TemplateRow } from "@/types/template";

const SUPERHEROES = [
  "Spider-Man",
  "Batman",
  "Wonder Woman",
  "Iron Man",
  "Thor",
  "Hulk",
  "Black Widow",
  "Captain America",
  "Wolverine",
  "Flash",
  "Aquaman",
  "Doctor Strange",
  "Black Panther",
  "Ant-Man",
  "Hawkeye",
  "Supergirl",
  "Green Lantern",
  "Deadpool",
  "Star-Lord",
  "Gamora",
  "Vision",
  "Scarlet Witch",
  "Falcon",
  "Winter Soldier",
  "Shazam",
  "Cyborg",
  "Nightwing",
  "Robin",
  "Zatanna",
  "Constantine",
] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function pickSuperheroNames(count: number, seed: string): string[] {
  const n = Math.min(Math.max(count, 1), SUPERHEROES.length);
  const scored = SUPERHEROES.map((name, i) => ({
    name,
    score: hashString(`${seed}:${name}:${i}`),
  }));
  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, n).map((x) => x.name);
}

export function distributeTotal(total: number, count: number, seed: string): number[] {
  if (count <= 0) return [];
  if (total <= 0) return Array(count).fill(0);

  const weights = Array.from({ length: count }, (_, i) => {
    return (hashString(`${seed}:w:${i}`) % 90) + 10;
  });
  const weightSum = weights.reduce((a, b) => a + b, 0);

  const shares = weights.map((w) => Math.floor((total * w) / weightSum));
  let remainder = total - shares.reduce((a, b) => a + b, 0);
  let idx = hashString(seed) % count;

  while (remainder > 0) {
    shares[idx % count] += 1;
    remainder -= 1;
    idx += 1;
  }

  return shares;
}

export function splitBuyerStats(
  leads: number,
  invalids: number,
  deposits: number,
  buyerCount: number,
  seed: string,
): Array<{ name: string; leads: number; invalids: number; deposits: number }> {
  const names = pickSuperheroNames(buyerCount, seed);
  const leadShares = distributeTotal(leads, names.length, `${seed}:leads`);
  const depositShares = distributeTotal(deposits, names.length, `${seed}:dep`);

  return names.map((name, i) => {
    const bLeads = leadShares[i] ?? 0;
    const bInvalids =
      leads > 0 ? Math.min(bLeads, Math.round((invalids * bLeads) / leads)) : 0;
    return {
      name,
      leads: bLeads,
      invalids: bInvalids,
      deposits: depositShares[i] ?? 0,
    };
  });
}

export function parseTemplateGeos(template: TemplateRow): GeoConfig[] {
  const fallbackBuyers = template.buyerCount ?? 5;

  if (Array.isArray(template.geosJson) && template.geosJson.length > 0) {
    return (template.geosJson as GeoConfig[]).map((g) => ({
      geo: String(g.geo).toUpperCase(),
      geoLabel: g.geoLabel ?? null,
      leads: Number(g.leads) || 0,
      invalids: Number(g.invalids) || 0,
      deposits: Number(g.deposits) || 0,
      buyerCount: Number(g.buyerCount) || fallbackBuyers,
      todayLeads: g.todayLeads != null ? Number(g.todayLeads) : undefined,
      todayInvalids: g.todayInvalids != null ? Number(g.todayInvalids) : undefined,
      todayDeposits: g.todayDeposits != null ? Number(g.todayDeposits) : undefined,
      skipWeekends: g.skipWeekends === true,
      depositSchedule: g.depositSchedule,
      targetCr: g.targetCr != null ? Number(g.targetCr) : undefined,
      crBasis: g.crBasis === "valids" ? "valids" : g.crBasis === "leads" ? "leads" : undefined,
      periodLeads: g.periodLeads != null ? Number(g.periodLeads) : undefined,
    }));
  }

  return [
    {
      geo: template.geo,
      geoLabel: template.geoLabel,
      leads: template.leads,
      invalids: template.invalids,
      deposits: template.deposits,
      buyerCount: fallbackBuyers,
    },
  ];
}

export function summarizeGeos(geos: GeoConfig[]): {
  totalLeads: number;
  totalDeposits: number;
  geoCodes: string[];
} {
  return {
    totalLeads: geos.reduce((s, g) => s + g.leads, 0),
    totalDeposits: geos.reduce((s, g) => s + g.deposits, 0),
    geoCodes: geos.map((g) => g.geo.toUpperCase()),
  };
}

export function summarizeGeosToday(geos: GeoConfig[]): {
  totalLeads: number;
  totalInvalids: number;
  totalDeposits: number;
  geoCodes: string[];
} {
  return {
    totalLeads: geos.reduce((s, g) => s + getGeoTodayMetrics(g).leads, 0),
    totalInvalids: geos.reduce((s, g) => s + getGeoTodayMetrics(g).invalids, 0),
    totalDeposits: geos.reduce((s, g) => s + getGeoTodayMetrics(g).deposits, 0),
    geoCodes: geos.map((g) => g.geo.toUpperCase()),
  };
}
