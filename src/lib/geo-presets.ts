import { countries, hasFlag } from "country-flag-icons";
import { getCountryName } from "./country-names";

/** Усі ISO-коди з пакета country-flag-icons (~260 країн). */
export const GEO_PRESET_CODES: readonly string[] = [...countries].sort();

/** Popular shortcuts — empty by default (neutral portfolio). Search any ISO code. */
export const POPULAR_GEO_CODES: readonly string[] = [];

export function isPresetGeo(code: string): boolean {
  return hasFlag(code.toUpperCase());
}

export function normalizeGeoCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 10);
}

export function filterGeoCodes(query: string, locale: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return GEO_PRESET_CODES.filter((code) => {
    if (code.toLowerCase().includes(q)) return true;
    return getCountryName(code, locale).toLowerCase().includes(q);
  }).slice(0, 80);
}

export function buyerOfferName(buyerName: string): string {
  const slug = buyerName.replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 80);
  return `__buyer_${slug}`;
}

export function isBuyerOfferName(offerName: string): boolean {
  return offerName === "__buyer" || offerName.startsWith("__buyer_");
}
