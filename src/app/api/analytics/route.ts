import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getOffersAnalytics } from "@/lib/stats";
import { geoFilterSchema, crBasisSchema, isoDateSchema } from "@/lib/validations";

function parseDateRange(searchParams: URLSearchParams) {
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;

  if (dateFrom || dateTo) {
    if (!dateFrom || !dateTo) {
      return { error: "Both dateFrom and dateTo are required" as const };
    }
    if (!isoDateSchema.safeParse(dateFrom).success) {
      return { error: "Invalid dateFrom" as const };
    }
    if (!isoDateSchema.safeParse(dateTo).success) {
      return { error: "Invalid dateTo" as const };
    }
    return { dateFrom, dateTo };
  }

  const date = searchParams.get("date") ?? undefined;
  if (date && !isoDateSchema.safeParse(date).success) {
    return { error: "Invalid date" as const };
  }

  return { date };
}

export async function GET(request: NextRequest) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const range = parseDateRange(searchParams);
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  const geoParam = searchParams.get("geo") ?? undefined;
  const geoParsed = geoFilterSchema.safeParse(geoParam);
  if (!geoParsed.success) {
    return NextResponse.json({ error: "Invalid geo" }, { status: 400 });
  }

  const crBasisParsed = crBasisSchema.safeParse(searchParams.get("crBasis") ?? "leads");
  if (!crBasisParsed.success) {
    return NextResponse.json({ error: "Invalid crBasis" }, { status: 400 });
  }

  try {
    const offers = await getOffersAnalytics({
      ...("dateFrom" in range && range.dateFrom
        ? { dateFrom: range.dateFrom, dateTo: range.dateTo }
        : { period: "today", date: range.date }),
      geo: geoParsed.data,
      crBasis: crBasisParsed.data,
    });
    return NextResponse.json({ offers });
  } catch {
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
