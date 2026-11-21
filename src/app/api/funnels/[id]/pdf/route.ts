import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { Readable } from "stream";
import {
  getFunnel,
  readFunnelPdf,
  saveFunnelPdf,
} from "@/lib/funnels-storage";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PDF_BYTES = 40 * 1024 * 1024;

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const funnel = await getFunnel(id);
  if (!funnel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdf = await readFunnelPdf(id);
  if (!pdf) {
    return NextResponse.json({ error: "No PDF yet" }, { status: 404 });
  }

  const nodeStream = createReadStream(pdf.abs);
  const webStream = Readable.toWeb(nodeStream) as ReadableStream;
  const downloadName = pdf.fileName.endsWith(".pdf")
    ? pdf.fileName
    : `${pdf.fileName}.pdf`;

  return new NextResponse(webStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function POST(request: NextRequest, context: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const funnel = await getFunnel(id);
  if (!funnel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file === "string" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "PDF required" }, { status: 400 });
  }

  const blob = file as File;
  const name = typeof blob.name === "string" ? blob.name : "preview.pdf";
  if (!name.toLowerCase().endsWith(".pdf") && blob.type !== "application/pdf") {
    return NextResponse.json({ error: "PDF required" }, { status: 400 });
  }

  const buf = Buffer.from(await blob.arrayBuffer());
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "Empty PDF" }, { status: 400 });
  }
  if (buf.byteLength > MAX_PDF_BYTES) {
    return NextResponse.json({ error: "PDF too large" }, { status: 413 });
  }
  // %PDF magic
  if (buf.subarray(0, 4).toString("utf8") !== "%PDF") {
    return NextResponse.json({ error: "Invalid PDF" }, { status: 400 });
  }

  try {
    const saved = await saveFunnelPdf(id, buf, name.replace(/\.pdf$/i, ""));
    const updated = await getFunnel(id);
    return NextResponse.json({ ok: true, ...saved, funnel: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "save failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
