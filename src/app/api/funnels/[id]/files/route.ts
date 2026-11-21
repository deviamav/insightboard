import { NextRequest, NextResponse } from "next/server";
import {
  getFunnel,
  listFunnelFiles,
  listPreviewablePages,
  readFunnelFile,
} from "@/lib/funnels-storage";
import { preparePreviewHtml, summarizeAssets } from "@/lib/funnel-preview";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const funnel = await getFunnel(id);
  if (!funnel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rel = request.nextUrl.searchParams.get("path");
  if (!rel) {
    const files = await listFunnelFiles(id);
    return NextResponse.json({
      funnel,
      files,
      pages: listPreviewablePages(files),
      assets: summarizeAssets(files),
    });
  }

  if (rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  // HTML/PHP: same pipeline as /asset/ (includes + CSS inject + absolute URLs)
  if (/\.(php|html?)$/i.test(rel)) {
    const buf = await readFunnelFile(id, rel);
    if (!buf) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const files = await listFunnelFiles(id);
    const html = await preparePreviewHtml({
      funnelId: id,
      entryRelPath: rel,
      raw: buf.toString("utf8"),
      allFiles: files,
      readFile: async (p) => {
        const b = await readFunnelFile(id, p);
        return b ? b.toString("utf8") : null;
      },
    });
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache",
        "X-Frame-Options": "SAMEORIGIN",
      },
    });
  }

  // Binary / CSS / etc → clean asset path
  const clean = rel
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");
  return NextResponse.redirect(
    new URL(`/api/funnels/${id}/asset/${clean}`, request.url),
  );
}
