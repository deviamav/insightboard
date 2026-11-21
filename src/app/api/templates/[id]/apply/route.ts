import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { applyTemplate } from "@/lib/templates";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const template = await applyTemplate(id);
    return NextResponse.json({
      ok: true,
      name: template.name,
      geo: template.geo,
    });
  } catch {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
}
