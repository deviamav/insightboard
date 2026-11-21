import path from "path";
import { softPreviewPhp } from "@/lib/funnels-storage";

/** Resolve relative URL against a directory prefix (posix). */
export function resolveAssetPath(fromDir: string, url: string): string | null {
  let u = url.trim();
  if (!u) return null;
  if (/^(https?:|\/\/|data:|mailto:|tel:|#|javascript:)/i.test(u)) return null;
  u = u.split("?")[0].split("#")[0];
  if (!u) return null;

  if (u.startsWith("/")) {
    return u.replace(/^\/+/, "");
  }

  const base = fromDir.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const joined = base ? `${base}/${u.replace(/^\.\//, "")}` : u.replace(/^\.\//, "");
  const parts: string[] = [];
  for (const seg of joined.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") {
      if (parts.length) parts.pop();
      continue;
    }
    parts.push(seg);
  }
  return parts.join("/");
}

export function assetUrl(funnelId: string, relPath: string): string {
  return `/api/funnels/${funnelId}/asset/${relPath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/")}`;
}

function ensureHtmlShell(text: string): string {
  let out = text;
  if (!/<html[\s>]/i.test(out)) {
    out = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${out}</body></html>`;
  }
  if (!/<head[\s>]/i.test(out)) {
    out = out.replace(/<html([^>]*)>/i, `<html$1><head><meta charset="utf-8"></head>`);
  }
  if (!/<meta[^>]+charset/i.test(out)) {
    out = out.replace(/<head([^>]*)>/i, `<head$1><meta charset="utf-8">`);
  }
  return out;
}

/**
 * Inline local include/require so header/footer (with CSS/img) survive soft PHP strip.
 * Replaces the statement with `?>…html…<?php` so surrounding PHP tags stay valid.
 */
export async function expandPhpIncludes(
  source: string,
  entryRel: string,
  readFile: (rel: string) => Promise<string | null>,
  depth = 0,
): Promise<string> {
  if (depth > 8) return source;
  const dir = entryRel.includes("/")
    ? entryRel.slice(0, entryRel.lastIndexOf("/") + 1)
    : "";

  const includeRe =
    /\b(?:include|include_once|require|require_once)\s*\(?\s*['"]([^'"]+)['"]\s*\)?\s*;/gi;

  const matches = [...source.matchAll(includeRe)];
  if (!matches.length) return source;

  let result = source;
  // Replace from the end so indices stay valid
  for (let i = matches.length - 1; i >= 0; i--) {
    const m = matches[i];
    const raw = m[1];
    const resolved = resolveAssetPath(dir, raw);
    if (!resolved || m.index == null) continue;
    const included = await readFile(resolved);
    if (included == null) continue;
    const expanded = await expandPhpIncludes(
      included,
      resolved,
      readFile,
      depth + 1,
    );
    const replacement = `?>\n<!-- include:${resolved} -->\n${expanded}\n<?php `;
    result =
      result.slice(0, m.index) + replacement + result.slice(m.index + m[0].length);
  }
  return result;
}

/**
 * Make all local asset URLs absolute under /api/funnels/:id/asset/...
 * so preview works even when document is opened via query-string URL.
 */
export function absolutizeAssetUrls(
  html: string,
  funnelId: string,
  entryRelPath: string,
): string {
  const dir = entryRelPath.includes("/")
    ? entryRelPath.slice(0, entryRelPath.lastIndexOf("/") + 1)
    : "";

  const toAsset = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (/^\/api\//i.test(trimmed)) return null;
    const resolved = resolveAssetPath(dir, trimmed);
    if (!resolved) return null;
    return assetUrl(funnelId, resolved);
  };

  // Protect <base> so we don't rewrite its href
  const bases: string[] = [];
  let text = html.replace(/<base\b[^>]*>/gi, (m) => {
    bases.push(m);
    return `<!--FS_BASE_${bases.length - 1}-->`;
  });

  text = text.replace(
    /\b(src|href|poster|data-src|data-background)=["'](?!https?:|\/\/|data:|mailto:|tel:|#|javascript:|\/api\/)([^"']+)["']/gi,
    (full, attr: string, url: string) => {
      const abs = toAsset(url);
      return abs ? `${attr}="${abs}"` : full;
    },
  );

  text = text.replace(/srcset=["']([^"']+)["']/gi, (full, value: string) => {
    const parts = value.split(",").map((chunk: string) => {
      const bits = chunk.trim().split(/\s+/);
      const u = bits[0];
      const abs = toAsset(u);
      if (!abs) return chunk.trim();
      return [abs, ...bits.slice(1)].join(" ");
    });
    return `srcset="${parts.join(", ")}"`;
  });

  text = text.replace(
    /url\(\s*['"]?(?!https?:|data:|\/\/|\/api\/)([^)'"]+)['"]?\s*\)/gi,
    (full, url: string) => {
      const abs = toAsset(url.trim());
      return abs ? `url("${abs}")` : full;
    },
  );

  return text.replace(/<!--FS_BASE_(\d+)-->/g, (_, i) => bases[Number(i)] ?? "");
}

export function injectDiscoveredAssets(
  html: string,
  funnelId: string,
  files: string[],
): string {
  // CSS — PHP often echoes <link> tags that soft-strip removes.
  const css = files.filter((f) => /\.css$/i.test(f));
  // JS — quizzes need scripts to advance steps in preview/PDF walk
  const jsAll = files.filter((f) => /\.js$/i.test(f));

  const linked = new Set<string>();
  for (const m of html.matchAll(
    /<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi,
  )) {
    const u = m[1].split("?")[0];
    const pathPart = u.replace(/^.*\/asset\//, "").replace(/^\/+/, "");
    try {
      linked.add(decodeURIComponent(pathPart).replace(/\\/g, "/").toLowerCase());
    } catch {
      linked.add(pathPart.replace(/\\/g, "/").toLowerCase());
    }
    const base = u.split("/").pop()?.toLowerCase();
    if (base) linked.add(base);
  }

  const missingCss = css.filter((f) => {
    const low = f.toLowerCase();
    return !linked.has(low) && !linked.has(low.split("/").pop() || "");
  });

  const missingJs = jsAll.filter((f) => {
    const low = f.toLowerCase();
    return !linked.has(low) && !linked.has(low.split("/").pop() || "");
  });

  const jsSorted = [...missingJs].sort((a, b) => {
    const score = (p: string) => {
      const n = p.toLowerCase();
      if (/jquery(\.min)?\.js$/.test(n)) return 0;
      if (/jquery/.test(n)) return 1;
      if (/(plugin|vendor|lib|bootstrap|swiper)/.test(n)) return 2;
      if (/(main|app|script|common|init)/.test(n)) return 3;
      if (/(quiz|step|question|funnel|lander)/.test(n)) return 4;
      return 5;
    };
    return score(a) - score(b) || a.localeCompare(b);
  });

  const links = missingCss
    .map(
      (f) =>
        `<link rel="stylesheet" href="${assetUrl(funnelId, f)}" data-fs-inject="1">`,
    )
    .join("\n");

  const scripts = jsSorted
    .slice(0, 40)
    .map(
      (f) =>
        `<script src="${assetUrl(funnelId, f)}" data-fs-inject="1"><\/script>`,
    )
    .join("\n");

  let text = ensureHtmlShell(html);
  if (links) {
    if (/<\/head>/i.test(text)) {
      text = text.replace(/<\/head>/i, `${links}\n</head>`);
    } else {
      text = text.replace(/<head([^>]*)>/i, `<head$1>${links}`);
    }
  }
  if (scripts) {
    if (/<\/body>/i.test(text)) {
      text = text.replace(/<\/body>/i, `${scripts}\n</body>`);
    } else {
      text += `\n${scripts}`;
    }
  }
  return text;
}

export async function preparePreviewHtml(opts: {
  funnelId: string;
  entryRelPath: string;
  raw: string;
  allFiles: string[];
  readFile: (rel: string) => Promise<string | null>;
}): Promise<string> {
  const { funnelId, entryRelPath, raw, allFiles, readFile } = opts;

  let text = await expandPhpIncludes(raw, entryRelPath, readFile);
  text = softPreviewPhp(text);
  text = ensureHtmlShell(text);

  // Base helps any remaining relative URLs; document should preferably be served from /asset/
  const dir = entryRelPath.includes("/")
    ? entryRelPath.slice(0, entryRelPath.lastIndexOf("/") + 1)
    : "";
  const baseHref = assetUrl(funnelId, dir || "").replace(/\/?$/, "/");
  // assetUrl with empty gives `/api/funnels/id/asset/` - good
  const baseTag = `<base href="${baseHref.endsWith("/") ? baseHref : `${baseHref}/`}">`;
  if (/<base\s/i.test(text)) {
    text = text.replace(/<base[^>]*>/i, baseTag);
  } else {
    text = text.replace(/<head([^>]*)>/i, `<head$1>\n${baseTag}\n`);
  }

  text = absolutizeAssetUrls(text, funnelId, entryRelPath);
  text = injectDiscoveredAssets(text, funnelId, allFiles);
  return text;
}

/** @deprecated use preparePreviewHtml */
export function rewritePreviewHtml(
  html: string,
  funnelId: string,
  entryRelPath: string,
): string {
  let text = ensureHtmlShell(softPreviewPhp(html));
  const dir = entryRelPath.includes("/")
    ? entryRelPath.slice(0, entryRelPath.lastIndexOf("/") + 1)
    : "";
  const baseHref = `/api/funnels/${funnelId}/asset/${dir}`;
  const baseTag = `<base href="${baseHref.endsWith("/") ? baseHref : `${baseHref}/`}">`;
  if (/<base\s/i.test(text)) text = text.replace(/<base[^>]*>/i, baseTag);
  else text = text.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  return absolutizeAssetUrls(text, funnelId, entryRelPath);
}

export function summarizeAssets(files: string[]) {
  const images = files.filter((f) =>
    /\.(png|jpe?g|gif|webp|svg|ico|avif|bmp)$/i.test(f),
  ).length;
  const styles = files.filter((f) => /\.css$/i.test(f)).length;
  const scripts = files.filter((f) => /\.js$/i.test(f)).length;
  const pages = files.filter((f) => /\.(html?|php)$/i.test(f)).length;
  return { images, styles, scripts, pages, total: files.length };
}

export function guessExtContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    ".html": "text/html; charset=utf-8",
    ".htm": "text/html; charset=utf-8",
    ".php": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".txt": "text/plain; charset=utf-8",
    ".xml": "application/xml; charset=utf-8",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mp3": "audio/mpeg",
  };
  return map[ext] ?? "application/octet-stream";
}
