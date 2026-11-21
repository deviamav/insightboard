import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseTemplateGeos } from "@/lib/buyers";
import { prisma } from "@/lib/prisma";
import {
  ensureStatsThroughToday,
  getActiveTemplate,
  getAvailableGeos,
} from "@/lib/templates";

export async function GET() {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureStatsThroughToday();

  const [geos, active] = await Promise.all([
    getAvailableGeos(),
    getActiveTemplate(),
  ]);

  const activeGeos = active ? parseTemplateGeos(active) : [];

  const latestMain = await prisma.dailyStat.findFirst({
    where: { offerName: "" },
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const earliestMain = await prisma.dailyStat.findFirst({
    where: { offerName: "" },
    orderBy: { date: "asc" },
    select: { date: true },
  });

  const todayIso = new Date().toISOString().slice(0, 10);
  const latestIso = latestMain?.date.toISOString().slice(0, 10) ?? null;
  const earliestIso = earliestMain?.date.toISOString().slice(0, 10) ?? null;

  const defaultStatsDate =
    latestIso && latestIso >= todayIso
      ? todayIso
      : latestIso ??
        active?.anchorDate.toISOString().slice(0, 10) ??
        todayIso;

  return NextResponse.json({
    geos,
    defaultStatsDate,
    statsDateMin: earliestIso,
    statsDateMax: latestIso,
    activeTemplate: active
      ? {
          id: active.id,
          name: active.name,
          geo: active.geo,
          geoLabel: active.geoLabel,
          anchorDate: active.anchorDate.toISOString().slice(0, 10),
          geoCodes: activeGeos.map((g) => g.geo),
          buyerCount: active.buyerCount,
        }
      : null,
  });
}
