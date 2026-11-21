import { NextRequest, NextResponse } from "next/server";
import {
  getFunnel,
  listFunnelFiles,
  readFunnelFile,
} from "@/lib/funnels-storage";
import {
  guessExtContentType,
  preparePreviewHtml,
  resolveAssetPath,
  assetUrl,
} from "@/lib/funnel-preview";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string; path?: string[] }> };

function rewriteCssUrls(css: string, funnelId: string, entryRel: string): string {
  const dir = entryRel.includes("/")
    ? entryRel.slice(0, entryRel.lastIndexOf("/") + 1)
    : "";
  return css.replace(
    /url\(\s*['"]?(?!https?:|data:|\/\/|\/api\/)([^)'"]+)['"]?\s*\)/gi,
    (full, url: string) => {
      const resolved = resolveAssetPath(dir, url.trim());
      if (!resolved) return full;
      return `url("${assetUrl(funnelId, resolved)}")`;
    },
  );
}

export async function GET(_request: NextRequest, context: Ctx) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, path: parts } = await context.params;
  const funnel = await getFunnel(id);
  if (!funnel) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rel = (parts ?? []).map(decodeURIComponent).join("/");
  if (!rel || rel.includes("..")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const buf = await readFunnelFile(id, rel);
  if (!buf) {
    return NextResponse.json({ error: "File not found", path: rel }, { status: 404 });
  }

  const ctype = guessExtContentType(rel);

  if (/\.(php|html?)$/i.test(rel)) {
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

  if (/\.css$/i.test(rel)) {
    const css = rewriteCssUrls(buf.toString("utf8"), id, rel);
    return new NextResponse(css, {
      headers: {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "private, max-age=120",
      },
    });
  }

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": ctype,
      "Cache-Control": "private, max-age=120",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
