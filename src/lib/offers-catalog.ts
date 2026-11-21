import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";

export type PayoutModel = "CPL" | "CPA" | "CRG";

export interface OfferInput {
  geo: string;
  title?: string | null;
  payoutModel?: PayoutModel;
  price: number;
  testPrice?: number | null;
  crMin?: number | null;
  crMax?: number | null;
  crNote?: string | null;
  /** Funnel IDs from /funnels catalog. */
  funnels: string[];
  sources: string[];
  lpdMin?: number | null;
  lpdMax?: number | null;
  notes?: string | null;
  sortOrder?: number;
}

export interface OfferDto {
  id: string;
  geo: string;
  title: string | null;
  payoutModel: PayoutModel;
  price: number;
  testPrice: number | null;
  crMin: number | null;
  crMax: number | null;
  crNote: string | null;
  funnels: string[];
  sources: string[];
  lpdMin: number | null;
  lpdMax: number | null;
  notes: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (x): x is string => typeof x === "string" && x.trim().length > 0,
  );
}

function asPayoutModel(v: string | null | undefined): PayoutModel {
  if (v === "CPA" || v === "CRG" || v === "CPL") return v;
  return "CPL";
}

function serializeOffer(row: {
  id: string;
  geo: string;
  title: string | null;
  payoutModel: string;
  price: Prisma.Decimal;
  testPrice: Prisma.Decimal | null;
  crMin: Prisma.Decimal | null;
  crMax: Prisma.Decimal | null;
  crNote: string | null;
  funnelsJson: Prisma.JsonValue;
  sourcesJson: Prisma.JsonValue;
  lpdMin: number | null;
  lpdMax: number | null;
  notes: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): OfferDto {
  return {
    id: row.id,
    geo: row.geo,
    title: row.title,
    payoutModel: asPayoutModel(row.payoutModel),
    price: Number(row.price),
    testPrice: row.testPrice != null ? Number(row.testPrice) : null,
    crMin: row.crMin != null ? Number(row.crMin) : null,
    crMax: row.crMax != null ? Number(row.crMax) : null,
    crNote: row.crNote,
    funnels: asStringArray(row.funnelsJson),
    sources: asStringArray(row.sourcesJson),
    lpdMin: row.lpdMin,
    lpdMax: row.lpdMax,
    notes: row.notes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listOffers(): Promise<OfferDto[]> {
  const rows = await prisma.offer.findMany({
    orderBy: [{ sortOrder: "asc" }, { geo: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(serializeOffer);
}

export async function getOffer(id: string): Promise<OfferDto | null> {
  const row = await prisma.offer.findUnique({ where: { id } });
  return row ? serializeOffer(row) : null;
}

export async function createOffer(input: OfferInput): Promise<OfferDto> {
  const row = await prisma.offer.create({
    data: {
      geo: input.geo.toUpperCase(),
      title: input.title?.trim() || null,
      payoutModel: input.payoutModel ?? "CPL",
      price: input.price,
      testPrice: input.testPrice ?? null,
      crMin: input.crMin ?? null,
      crMax: input.crMax ?? null,
      crNote: input.crNote?.trim() || null,
      funnelsJson: input.funnels,
      sourcesJson: input.sources,
      lpdMin: input.lpdMin ?? null,
      lpdMax: input.lpdMax ?? null,
      notes: input.notes?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return serializeOffer(row);
}

export async function updateOffer(
  id: string,
  input: OfferInput,
): Promise<OfferDto> {
  const row = await prisma.offer.update({
    where: { id },
    data: {
      geo: input.geo.toUpperCase(),
      title: input.title?.trim() || null,
      payoutModel: input.payoutModel ?? "CPL",
      price: input.price,
      testPrice: input.testPrice ?? null,
      crMin: input.crMin ?? null,
      crMax: input.crMax ?? null,
      crNote: input.crNote?.trim() || null,
      funnelsJson: input.funnels,
      sourcesJson: input.sources,
      lpdMin: input.lpdMin ?? null,
      lpdMax: input.lpdMax ?? null,
      notes: input.notes?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
    },
  });
  return serializeOffer(row);
}

export async function deleteOffer(id: string) {
  await prisma.offer.delete({ where: { id } });
}

export async function seedDefaultOffers(): Promise<void> {
  const count = await prisma.offer.count();
  if (count > 0) return;

  const defaults: OfferInput[] = [
    {
      geo: "KZ",
      title: "Kazakhstan",
      payoutModel: "CPL",
      price: 21,
      testPrice: 19,
      crNote: "4%",
      crMin: 4,
      crMax: 4,
      funnels: [],
      sources: ["Facebook", "Google"],
      sortOrder: 1,
    },
    {
      geo: "KG",
      title: "Kyrgyzstan",
      payoutModel: "CPL",
      price: 14,
      crNote: "3-4%",
      crMin: 3,
      crMax: 4,
      funnels: [],
      sources: ["Facebook"],
      sortOrder: 2,
    },
    {
      geo: "RO",
      title: "Romania",
      payoutModel: "CPL",
      price: 90,
      crNote: "9-10%",
      crMin: 9,
      crMax: 10,
      funnels: [],
      sources: ["Facebook"],
      lpdMin: 10,
      lpdMax: 15,
      sortOrder: 3,
    },
  ];

  for (const offer of defaults) {
    await createOffer(offer);
  }
}
