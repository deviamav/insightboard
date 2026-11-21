import { distributeTotal } from "./buyers";
import type { TemplateRow } from "@/types/template";

export function parseOffersInput(raw: string): string[] {
  return raw
    .split(/[\n,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
}

import type { StatTemplate } from "@prisma/client";

export function parseTemplateOffers(
  template: Pick<TemplateRow, "offerName" | "offersJson"> | {
    offerName?: string | null;
    offers?: string[];
    offersJson?: unknown | null;
  },
): string[] {
  if ("offers" in template && Array.isArray(template.offers) && template.offers.length > 0) {
    return template.offers.map((o) => String(o).trim()).filter(Boolean).slice(0, 20);
  }
  if (Array.isArray(template.offersJson) && template.offersJson.length > 0) {
    return template.offersJson
      .map((o) => String(o).trim())
      .filter(Boolean)
      .slice(0, 20);
  }
  const legacy = (template.offerName ?? "").trim();
  return legacy ? [legacy] : [];
}

export function splitOfferStats(
  leads: number,
  invalids: number,
  deposits: number,
  noSend: number,
  offers: string[],
  seed: string,
): Array<{ name: string; leads: number; invalids: number; deposits: number; noSend: number }> {
  if (offers.length === 0) return [];

  const leadShares = distributeTotal(leads, offers.length, `${seed}:leads`);
  const depositShares = distributeTotal(deposits, offers.length, `${seed}:dep`);
  const noSendShares = distributeTotal(noSend, offers.length, `${seed}:nosend`);

  return offers.map((name, i) => {
    const bLeads = leadShares[i] ?? 0;
    const bInvalids =
      leads > 0 ? Math.min(bLeads, Math.round((invalids * bLeads) / leads)) : 0;
    return {
      name,
      leads: bLeads,
      invalids: bInvalids,
      deposits: depositShares[i] ?? 0,
      noSend: noSendShares[i] ?? 0,
    };
  });
}
