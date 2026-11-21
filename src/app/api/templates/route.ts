import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { normalizePeriodDate } from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import {
  applyTemplate,
  getActiveTemplate,
  listTemplates,
  buildGeosPayload,
  legacyFieldsFromGeos,
  geosToPrismaJson,
  offersToPrismaJson,
} from "@/lib/templates";
import { checkRateLimit, templateSchema } from "@/lib/validations";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [templates, active] = await Promise.all([
    listTemplates(),
    getActiveTemplate(),
  ]);

  return NextResponse.json({
    templates,
    active: active
      ? {
          id: active.id,
          name: active.name,
          geo: active.geo,
          geoLabel: active.geoLabel,
        }
      : null,
  });
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`template:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = templateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const anchorDate = normalizePeriodDate(
    new Date(data.date),
    data.periodType,
  );

  const geos = buildGeosPayload(data.geos ?? [], {
    geo: data.geo.toUpperCase(),
    geoLabel: data.geoLabel?.trim() || null,
    leads: data.leads,
    invalids: data.invalids,
    deposits: data.deposits,
  });
  const legacy = legacyFieldsFromGeos(geos);
  const offers = data.offers ?? [];

  const template = await prisma.statTemplate.create({
    data: {
      name: data.name,
      geo: legacy.geo,
      geoLabel: legacy.geoLabel,
      periodType: data.periodType,
      anchorDate,
      leads: legacy.leads,
      invalids: legacy.invalids,
      deposits: legacy.deposits,
      noSend: data.noSend ?? 0,
      offerName: offers[0] ?? (data.offerName ?? "").trim(),
      offersJson: offers.length > 0 ? offersToPrismaJson(offers) : undefined,
      buyerName: data.buyerName?.trim() || null,
      buyerCount: data.buyerCount ?? 5,
      geosJson: geosToPrismaJson(geos),
    },
  });

  if (data.apply) {
    await applyTemplate(template.id);
  }

  return NextResponse.json({ id: template.id }, { status: 201 });
}
