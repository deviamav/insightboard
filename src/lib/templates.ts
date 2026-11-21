import type { Prisma } from "@prisma/client";
import type { TemplateRow } from "@/types/template";
import { templateRowSelect } from "@/types/template";
import { prisma } from "./prisma";
import { calcMetrics } from "./calculations";
import {
  parseTemplateGeos,
  splitBuyerStats,
  summarizeGeos,
  summarizeGeosToday,
} from "./buyers";
import { buyerOfferName } from "./geo-presets";
import { parseTemplateOffers, splitOfferStats } from "./offers";
import {
  deriveDailyNoSend,
  getSpreadDates,
} from "./period-spread";
import { spreadGeoDailySeries } from "./geo-spread";
import type { GeoConfig } from "@/types/geo-config";
import { getGeoTodayMetrics } from "@/types/geo-config";

export interface TemplateInput {
  name: string;
  geo: string;
  geoLabel?: string | null;
  periodType: "day" | "week" | "month";
  anchorDate: Date;
  leads: number;
  invalids: number;
  deposits: number;
  noSend?: number;
  offerName?: string;
  offers?: string[];
  profit?: number;
  buyerName?: string | null;
  geos?: GeoConfig[];
  buyerCount?: number;
  id?: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function distributeHourly(
  leads: number,
  deposits: number,
  invalids: number,
): Array<{ hour: number; leads: number; deposits: number; invalids: number }> {
  const weights = Array.from({ length: 24 }, (_, h) => {
    if (h < 8 || h > 22) return 0.2;
    const peak = 1 - Math.abs(h - 14) / 8;
    return 0.3 + peak;
  });
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const result = weights.map((w, hour) => {
    const share = totalWeight > 0 ? w / totalWeight : 1 / 24;
    return {
      hour,
      leads: Math.round(leads * share),
      deposits: Math.round(deposits * share),
      invalids: Math.round(invalids * share),
    };
  });

  const fix = (key: "leads" | "deposits" | "invalids", total: number) => {
    const sum = result.reduce((a, r) => a + r[key], 0);
    const diff = total - sum;
    if (diff !== 0) result[14][key] += diff;
  };
  fix("leads", leads);
  fix("deposits", deposits);
  fix("invalids", invalids);

  return result;
}

export async function syncTemplateToStats(template: TemplateInput) {
  const geos =
    template.geos && template.geos.length > 0
      ? template.geos.map((g) => ({
          ...g,
          geo: g.geo.toUpperCase(),
          buyerCount: g.buyerCount ?? template.buyerCount ?? 5,
        }))
      : [
          {
            geo: template.geo.toUpperCase(),
            geoLabel: template.geoLabel ?? null,
            leads: template.leads,
            invalids: template.invalids,
            deposits: template.deposits,
            buyerCount: template.buyerCount ?? 5,
          },
        ];

  const seed = template.id ?? template.name;
  const anchor = startOfDay(template.anchorDate);
  const dates = getSpreadDates(anchor, template.periodType);
  const offers = template.offers ?? parseTemplateOffers(template);
  const lastDayIso = dates[dates.length - 1]?.toISOString().slice(0, 10) ?? "";

  await prisma.dailyStat.deleteMany({});

  for (const geoConfig of geos) {
    const geo = geoConfig.geo.toUpperCase();
    const dailySeries = spreadGeoDailySeries(
      dates,
      {
        leads: geoConfig.leads,
        invalids: geoConfig.invalids,
        deposits: geoConfig.deposits,
        noSend: template.noSend,
      },
      `${seed}-${geo}`,
      geoConfig,
      template.noSend,
    );

    const todayMetrics = getGeoTodayMetrics(geoConfig);
    const lastIdx = dailySeries.length - 1;
    const usePeriodBudget =
      geoConfig.periodLeads != null && geoConfig.periodLeads > 0;

    if (lastIdx >= 0 && !usePeriodBudget) {
      dailySeries[lastIdx] = {
        leads: todayMetrics.leads,
        invalids: todayMetrics.invalids,
        deposits: todayMetrics.deposits,
        noSend: deriveDailyNoSend(
          todayMetrics.leads,
          `${seed}-${geo}-today`,
          template.noSend,
        ),
        inactive: dailySeries[lastIdx]?.inactive ?? false,
      };
    }

    for (let dayIdx = 0; dayIdx < dates.length; dayIdx++) {
      const dayDate = dates[dayIdx];
      const dayMetrics = dailySeries[dayIdx];
      const { valids } = calcMetrics(
        dayMetrics.leads,
        dayMetrics.invalids,
        dayMetrics.deposits,
      );
      const dayIso = dayDate.toISOString().slice(0, 10);
      const isAnchorDay = dayIso === lastDayIso;

      await prisma.dailyStat.create({
        data: {
          date: dayDate,
          periodType: "day",
          geo,
          leads: dayMetrics.leads,
          valids,
          invalids: dayMetrics.invalids,
          deposits: dayMetrics.deposits,
          noSend: dayMetrics.noSend,
          offerName: "",
          profit: template.profit ?? 0,
        },
      });

      const offerRows = splitOfferStats(
        dayMetrics.leads,
        dayMetrics.invalids,
        dayMetrics.deposits,
        dayMetrics.noSend,
        offers,
        `${seed}-${geo}-offers-${dayIdx}`,
      );

      for (const offer of offerRows) {
        if (offer.leads === 0 && offer.deposits === 0) continue;
        const oValids = Math.max(0, offer.leads - offer.invalids);
        await prisma.dailyStat.create({
          data: {
            date: dayDate,
            periodType: "day",
            geo,
            leads: offer.leads,
            valids: oValids,
            invalids: offer.invalids,
            deposits: offer.deposits,
            noSend: offer.noSend,
            offerName: offer.name,
            profit: template.profit ?? 0,
          },
        });
      }

      if (isAnchorDay) {
        const hourly = distributeHourly(
          dayMetrics.leads,
          dayMetrics.deposits,
          dayMetrics.invalids,
        );
        for (const slot of hourly) {
          if (slot.leads === 0 && slot.deposits === 0) continue;
          const slotValids = Math.max(0, slot.leads - slot.invalids);
          await prisma.dailyStat.create({
            data: {
              date: dayDate,
              periodType: "day",
              geo,
              leads: slot.leads,
              valids: slotValids,
              invalids: slot.invalids,
              deposits: slot.deposits,
              offerName: `__hour_${slot.hour}`,
              hour: slot.hour,
            },
          });
        }
      }

      const buyers = splitBuyerStats(
        dayMetrics.leads,
        dayMetrics.invalids,
        dayMetrics.deposits,
        geoConfig.buyerCount ?? 5,
        `${seed}-${geo}`,
      );

      for (const buyer of buyers) {
        if (buyer.leads === 0 && buyer.deposits === 0) continue;
        const bValids = Math.max(0, buyer.leads - buyer.invalids);
        await prisma.dailyStat.create({
          data: {
            date: dayDate,
            periodType: "day",
            geo,
            leads: buyer.leads,
            valids: bValids,
            invalids: buyer.invalids,
            deposits: buyer.deposits,
            buyerName: buyer.name,
            offerName: buyerOfferName(buyer.name),
          },
        });
      }
    }
  }

  const summary = summarizeGeos(geos);
  return {
    geo: summary.geoCodes[0] ?? template.geo,
    geos: summary.geoCodes,
    days: dates.length,
    valids: summary.totalLeads,
  };
}

export async function applyTemplate(templateId: string) {
  const template = await prisma.statTemplate.findUnique({
    where: { id: templateId },
    select: templateRowSelect,
  });
  if (!template) throw new Error("Template not found");

  const geos = parseTemplateGeos(template);
  const today = startOfDay(new Date());
  const anchorDate = template.anchorDate < today ? today : template.anchorDate;

  if (anchorDate.getTime() !== template.anchorDate.getTime()) {
    await prisma.statTemplate.update({
      where: { id: templateId },
      data: { anchorDate },
    });
  }

  await syncTemplateToStats({
    id: template.id,
    name: template.name,
    geo: template.geo,
    geoLabel: template.geoLabel,
    periodType: template.periodType as "day" | "week" | "month",
    anchorDate,
    leads: template.leads,
    invalids: template.invalids,
    deposits: template.deposits,
    noSend: template.noSend,
    offerName: template.offerName,
    offers: parseTemplateOffers(template),
    profit: Number(template.profit),
    buyerName: template.buyerName,
    geos,
    buyerCount: template.buyerCount,
  });

  await prisma.appConfig.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", activeTemplateId: templateId },
    update: { activeTemplateId: templateId },
  });

  return template;
}

export async function ensureStatsThroughToday(): Promise<void> {
  const active = await getActiveTemplate();
  if (!active) return;

  const today = startOfDay(new Date());
  const latest = await prisma.dailyStat.findFirst({
    where: { offerName: "" },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (latest && startOfDay(latest.date) >= today) return;

  const anchorDate = active.anchorDate < today ? today : active.anchorDate;

  if (anchorDate.getTime() !== active.anchorDate.getTime()) {
    await prisma.statTemplate.update({
      where: { id: active.id },
      data: { anchorDate },
    });
  }

  const geos = parseTemplateGeos(active);

  await syncTemplateToStats({
    id: active.id,
    name: active.name,
    geo: active.geo,
    geoLabel: active.geoLabel,
    periodType: active.periodType as "day" | "week" | "month",
    anchorDate,
    leads: active.leads,
    invalids: active.invalids,
    deposits: active.deposits,
    noSend: active.noSend,
    offerName: active.offerName,
    offers: parseTemplateOffers(active),
    profit: Number(active.profit),
    buyerName: active.buyerName,
    geos,
    buyerCount: active.buyerCount,
  });
}

export async function getActiveTemplate(): Promise<TemplateRow | null> {
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });
  if (!config?.activeTemplateId) return null;
  return prisma.statTemplate.findUnique({
    where: { id: config.activeTemplateId },
    select: templateRowSelect,
  });
}

export async function listTemplates() {
  const templates = await prisma.statTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: templateRowSelect,
  });
  const active = await getActiveTemplate();

  return templates.map((row) => {
    const geos = parseTemplateGeos(row);
    const summary = summarizeGeosToday(geos);
    const m = calcMetrics(
      summary.totalLeads,
      summary.totalInvalids,
      summary.totalDeposits,
    );

    return {
      ...row,
      geos,
      offers: parseTemplateOffers(row),
      buyerCount: row.buyerCount,
      anchorDate: row.anchorDate.toISOString(),
      profit: Number(row.profit),
      valids: m.valids,
      cr: m.cr,
      invalidPercent: m.invalidPercent,
      isActive: active?.id === row.id,
      geoCodes: summary.geoCodes,
      totalLeads: summary.totalLeads,
    };
  });
}

export async function getActiveGeoCodes(): Promise<string[]> {
  const active = await getActiveTemplate();
  if (!active) return [];
  return parseTemplateGeos(active).map((g) => g.geo.toUpperCase());
}

export async function getAvailableGeos() {
  const active = await getActiveTemplate();
  if (!active) return [];

  return parseTemplateGeos(active).map((g) => ({
    code: g.geo.toUpperCase(),
    label: g.geoLabel ?? null,
  }));
}

export function geosToPrismaJson(geos: GeoConfig[]): Prisma.InputJsonValue {
  return geos as unknown as Prisma.InputJsonValue;
}

export function offersToPrismaJson(offers: string[]): Prisma.InputJsonValue {
  return offers as unknown as Prisma.InputJsonValue;
}

export function buildGeosPayload(
  geos: GeoConfig[],
  fallback: {
    geo: string;
    geoLabel?: string | null;
    leads: number;
    invalids: number;
    deposits: number;
    buyerCount?: number;
  },
): GeoConfig[] {
  if (geos.length > 0) return geos;
  return [fallback];
}

export function legacyFieldsFromGeos(geos: GeoConfig[]) {
  const first = geos[0];
  const summary = summarizeGeosToday(geos);
  return {
    geo: first.geo.toUpperCase(),
    geoLabel: first.geoLabel ?? null,
    leads: summary.totalLeads,
    invalids: summary.totalInvalids,
    deposits: summary.totalDeposits,
  };
}
