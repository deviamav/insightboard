import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { calcMetrics, normalizePeriodDate } from "@/lib/calculations";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, statEntrySchema } from "@/lib/validations";

export async function GET() {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const entries = await prisma.dailyStat.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      date: true,
      periodType: true,
      geo: true,
      leads: true,
      valids: true,
      invalids: true,
      deposits: true,
      offerName: true,
    },
  });

  return NextResponse.json(
    entries.map((e) => {
      const m = calcMetrics(e.leads, e.invalids, e.deposits);
      return {
        ...e,
        date: e.date.toISOString(),
        cr: m.cr,
        invalidPercent: m.invalidPercent,
      };
    }),
  );
}

export async function POST(request: NextRequest) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`entry:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = statEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const { valids, cr, invalidPercent } = calcMetrics(
    data.leads,
    data.invalids,
    data.deposits,
  );

  const normalizedDate = normalizePeriodDate(
    new Date(data.date),
    data.periodType,
  );
  const offerName = (data.offerName ?? "").trim();
  const geo = data.geo.toUpperCase();

  const entry = await prisma.dailyStat.upsert({
    where: {
      date_geo_periodType_offerName: {
        date: normalizedDate,
        geo,
        periodType: data.periodType,
        offerName,
      },
    },
    create: {
      date: normalizedDate,
      periodType: data.periodType,
      geo,
      leads: data.leads,
      valids,
      invalids: data.invalids,
      deposits: data.deposits,
      noSend: data.noSend ?? 0,
      offerName,
      profit: 0,
    },
    update: {
      leads: data.leads,
      valids,
      invalids: data.invalids,
      deposits: data.deposits,
      noSend: data.noSend ?? 0,
    },
  });

  return NextResponse.json(
    { id: entry.id, valids, cr, invalidPercent },
    { status: 201 },
  );
}
