import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { applyTemplate } from "@/lib/templates";
import { parseTemplateGeos } from "@/lib/buyers";
import { buildGeosPayload, legacyFieldsFromGeos, geosToPrismaJson, offersToPrismaJson } from "@/lib/templates";
import { normalizePeriodDate } from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import { templateUpdateSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = templateUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (data.name) updateData.name = data.name;
  if (data.geo) updateData.geo = data.geo.toUpperCase();
  if (data.geoLabel !== undefined) updateData.geoLabel = data.geoLabel?.trim() || null;
  if (data.periodType) updateData.periodType = data.periodType;
  if (data.date && data.periodType) {
    updateData.anchorDate = normalizePeriodDate(
      new Date(data.date),
      data.periodType,
    );
  }
  if (data.leads !== undefined) updateData.leads = data.leads;
  if (data.invalids !== undefined) updateData.invalids = data.invalids;
  if (data.deposits !== undefined) updateData.deposits = data.deposits;
  if (data.noSend !== undefined) updateData.noSend = data.noSend;
  if (data.offers !== undefined) {
    updateData.offersJson = offersToPrismaJson(data.offers);
    updateData.offerName = data.offers[0] ?? "";
  } else if (data.offerName !== undefined) {
    updateData.offerName = (data.offerName ?? "").trim();
  }
  if (data.buyerName !== undefined) updateData.buyerName = data.buyerName?.trim() || null;
  if (data.buyerCount !== undefined) updateData.buyerCount = data.buyerCount;

  if (data.geos && data.geos.length > 0) {
    const geos = buildGeosPayload(data.geos, {
      geo: (data.geo ?? "KZ").toUpperCase(),
      geoLabel: data.geoLabel ?? null,
      leads: data.leads ?? 0,
      invalids: data.invalids ?? 0,
      deposits: data.deposits ?? 0,
    });
    const legacy = legacyFieldsFromGeos(geos);
    updateData.geosJson = geosToPrismaJson(geos);
    updateData.geo = legacy.geo;
    updateData.geoLabel = legacy.geoLabel;
    updateData.leads = legacy.leads;
    updateData.invalids = legacy.invalids;
    updateData.deposits = legacy.deposits;
  } else if (data.geo || data.leads !== undefined) {
    const existing = await prisma.statTemplate.findUnique({ where: { id } });
    if (existing) {
      const geos = parseTemplateGeos({
        ...existing,
        geo: (data.geo ?? existing.geo).toUpperCase(),
        geoLabel: data.geoLabel !== undefined ? data.geoLabel : existing.geoLabel,
        leads: data.leads ?? existing.leads,
        invalids: data.invalids ?? existing.invalids,
        deposits: data.deposits ?? existing.deposits,
      });
      if (data.geo || data.leads !== undefined) {
        const merged = geos.map((g, i) =>
          i === 0
            ? {
                ...g,
                geo: (data.geo ?? g.geo).toUpperCase(),
                geoLabel: data.geoLabel !== undefined ? data.geoLabel : g.geoLabel,
                leads: data.leads ?? g.leads,
                invalids: data.invalids ?? g.invalids,
                deposits: data.deposits ?? g.deposits,
              }
            : g,
        );
        const legacy = legacyFieldsFromGeos(merged);
        updateData.geosJson = geosToPrismaJson(merged);
        updateData.geo = legacy.geo;
        updateData.leads = legacy.leads;
        updateData.invalids = legacy.invalids;
        updateData.deposits = legacy.deposits;
      }
    }
  }

  const template = await prisma.statTemplate.update({
    where: { id },
    data: updateData,
  });

  if (data.apply) {
    await applyTemplate(template.id);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const config = await prisma.appConfig.findUnique({ where: { id: "singleton" } });

  if (config?.activeTemplateId === id) {
    await prisma.appConfig.update({
      where: { id: "singleton" },
      data: { activeTemplateId: null },
    });
    await prisma.dailyStat.deleteMany({});
  }

  await prisma.statTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
