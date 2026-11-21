import { NextRequest, NextResponse } from "next/server";
import {
  createFunnelMeta,
  deleteFunnel,
  listFunnels,
  updateFunnelMeta,
} from "@/lib/funnels-storage";
import { isAuthenticated } from "@/lib/auth";
import { funnelMetaSchema } from "@/lib/validations";

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const funnels = await listFunnels();
  return NextResponse.json({ funnels });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = funnelMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const funnel = await createFunnelMeta({
    name: parsed.data.name,
    geo: parsed.data.geo,
    description: parsed.data.description,
    visibility: parsed.data.visibility,
    isQuiz: parsed.data.isQuiz,
  });
  return NextResponse.json(funnel, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("id" in body)) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const id = String((body as { id: unknown }).id);
  const parsed = funnelMetaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const funnel = await updateFunnelMeta(id, {
      name: parsed.data.name,
      geo: parsed.data.geo,
      description: parsed.data.description,
      visibility: parsed.data.visibility,
      isQuiz: parsed.data.isQuiz,
    });
    return NextResponse.json(funnel);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  await deleteFunnel(id);
  return NextResponse.json({ ok: true });
}
