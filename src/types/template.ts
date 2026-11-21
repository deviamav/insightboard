/** DB row shape for stat_templates (stable regardless of Prisma client cache). */
export interface TemplateRow {
  id: string;
  name: string;
  geo: string;
  geoLabel: string | null;
  periodType: string;
  anchorDate: Date;
  leads: number;
  invalids: number;
  deposits: number;
  noSend: number;
  offerName: string;
  offersJson: unknown | null;
  profit: unknown;
  buyerName: string | null;
  geosJson: unknown | null;
  buyerCount: number;
}

export const templateRowSelect = {
  id: true,
  name: true,
  geo: true,
  geoLabel: true,
  periodType: true,
  anchorDate: true,
  leads: true,
  invalids: true,
  deposits: true,
  noSend: true,
  offerName: true,
  offersJson: true,
  profit: true,
  buyerName: true,
  geosJson: true,
  buyerCount: true,
} as const;
