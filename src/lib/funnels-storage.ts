import {
  mkdir,
  writeFile,
  readFile,
  rm,
  readdir,
  access,
  constants,
  stat,
} from "fs/promises";
import path from "path";
import { unzipSync } from "fflate";
import type { Funnel } from "@prisma/client";
import { prisma } from "./prisma";

const MAX_ZIP_BYTES = 80 * 1024 * 1024;
const MAX_FILES = 2000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function getFunnelsRoot(): string {
  if (process.env.FUNNELS_DATA_DIR) return process.env.FUNNELS_DATA_DIR;
  return path.join(/* turbopackIgnore: true */ process.cwd(), "data", "funnels");
}

export function getFunnelDir(id: string): string {
  return path.join(getFunnelsRoot(), id);
}

export function getFunnelExtractDir(id: string): string {
  return path.join(getFunnelDir(id), "site");
}

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

function safeRelPath(name: string): string | null {
  const normalized = name.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    return null;
  }
  if (normalized.startsWith("__MACOSX/") || normalized.endsWith(".DS_Store")) {
    return null;
  }
  return normalized;
}

function findEntryFile(files: string[]): string | null {
  const lower = files.map((f) => f.toLowerCase());
  const prefs = [
    "index.html",
    "index.php",
    "home.html",
    "main.html",
    "quiz/index.html",
    "quiz/index.php",
  ];
  for (const p of prefs) {
    const idx = lower.findIndex((f) => f === p || f.endsWith(`/${p}`));
    if (idx >= 0) return files[idx];
  }
  const html = files.find((f) => /\.(html?|php)$/i.test(f));
  return html ?? files[0] ?? null;
}

function serializeFunnel(r: Funnel, diskMeta?: { isQuiz?: boolean }) {
  const row = r as Funnel & {
    zipSizeBytes?: number | null;
    visibility?: string | null;
    pdfFileName?: string | null;
    isQuiz?: boolean | null;
  };
  const pdfFileName = row.pdfFileName ?? null;
  const isQuiz = Boolean(row.isQuiz) || Boolean(diskMeta?.isQuiz);
  return {
    id: row.id,
    name: row.name,
    geo: row.geo,
    description: row.description,
    zipFileName: row.zipFileName,
    zipSizeBytes: row.zipSizeBytes ?? 0,
    pdfFileName,
    hasPdf: Boolean(pdfFileName),
    entryFile: row.entryFile,
    fileCount: row.fileCount,
    hasPhp: row.hasPhp,
    isQuiz,
    visibility: row.visibility === "private" ? ("private" as const) : ("public" as const),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function readDiskMeta(id: string): Promise<{ isQuiz?: boolean }> {
  try {
    const raw = await readFile(path.join(getFunnelDir(id), "meta.json"), "utf8");
    const parsed = JSON.parse(raw) as { isQuiz?: boolean };
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

async function writeDiskMeta(id: string, patch: { isQuiz?: boolean }) {
  await ensureDir(getFunnelDir(id));
  const prev = await readDiskMeta(id);
  const next = { ...prev, ...patch };
  await writeFile(
    path.join(getFunnelDir(id), "meta.json"),
    JSON.stringify(next, null, 2),
    "utf8",
  );
}

export async function listFunnels() {
  const rows = await prisma.funnel.findMany({
    orderBy: [{ createdAt: "desc" }],
  });
  return Promise.all(
    rows.map(async (r) => serializeFunnel(r, await readDiskMeta(r.id))),
  );
}

export async function getFunnel(id: string) {
  const r = await prisma.funnel.findUnique({ where: { id } });
  if (!r) return null;
  return serializeFunnel(r, await readDiskMeta(id));
}

export async function createFunnelMeta(input: {
  name: string;
  geo?: string | null;
  description?: string | null;
  visibility?: "public" | "private";
  isQuiz?: boolean;
}) {
  const base = {
    name: input.name.trim(),
    geo: input.geo ? input.geo.toUpperCase() : null,
    description: input.description?.trim() || null,
  };

  let row: Funnel;
  try {
    row = await prisma.funnel.create({
      data: {
        ...base,
        visibility: input.visibility ?? "public",
        isQuiz: Boolean(input.isQuiz),
      } as Parameters<typeof prisma.funnel.create>[0]["data"],
    });
  } catch {
    try {
      row = await prisma.funnel.create({
        data: {
          ...base,
          visibility: input.visibility ?? "public",
        } as Parameters<typeof prisma.funnel.create>[0]["data"],
      });
    } catch {
      row = await prisma.funnel.create({ data: base });
    }
  }

  try {
    await ensureDir(getFunnelExtractDir(row.id));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "mkdir failed";
    throw new Error(`Cannot write funnel storage: ${msg}`);
  }
  await writeDiskMeta(row.id, { isQuiz: Boolean(input.isQuiz) }).catch(() => null);
  return getFunnel(row.id);
}

export async function updateFunnelMeta(
  id: string,
  input: {
    name: string;
    geo?: string | null;
    description?: string | null;
    visibility?: "public" | "private";
    isQuiz?: boolean;
  },
) {
  const base = {
    name: input.name.trim(),
    geo: input.geo ? input.geo.toUpperCase() : null,
    description: input.description?.trim() || null,
  };
  try {
    await prisma.funnel.update({
      where: { id },
      data: {
        ...base,
        ...(input.visibility ? { visibility: input.visibility } : {}),
        isQuiz: Boolean(input.isQuiz),
      } as Parameters<typeof prisma.funnel.update>[0]["data"],
    });
  } catch {
    try {
      await prisma.funnel.update({
        where: { id },
        data: {
          ...base,
          ...(input.visibility ? { visibility: input.visibility } : {}),
        } as Parameters<typeof prisma.funnel.update>[0]["data"],
      });
    } catch {
      await prisma.funnel.update({ where: { id }, data: base });
    }
  }
  // Always persist quiz flag on disk (works even before DB migration)
  await writeDiskMeta(id, { isQuiz: Boolean(input.isQuiz) }).catch(() => null);
  return getFunnel(id);
}

export async function deleteFunnel(id: string) {
  await prisma.funnel.delete({ where: { id } }).catch(() => null);
  await rm(getFunnelDir(id), { recursive: true, force: true }).catch(() => null);
}

async function persistFunnelZipMeta(
  id: string,
  data: {
    zipFileName: string;
    zipSizeBytes: number;
    entryFile: string | null;
    fileCount: number;
    hasPhp: boolean;
  },
) {
  try {
    await prisma.funnel.update({
      where: { id },
      data: {
        zipFileName: data.zipFileName,
        zipSizeBytes: data.zipSizeBytes,
        entryFile: data.entryFile,
        fileCount: data.fileCount,
        hasPhp: data.hasPhp,
      } as Parameters<typeof prisma.funnel.update>[0]["data"],
    });
  } catch {
    await prisma.funnel.update({
      where: { id },
      data: {
        zipFileName: data.zipFileName,
        entryFile: data.entryFile,
        fileCount: data.fileCount,
        hasPhp: data.hasPhp,
      },
    });
  }
}

export async function extractFunnelZip(
  id: string,
  zipBuffer: Buffer,
  originalName: string,
): Promise<{ fileCount: number; entryFile: string | null; hasPhp: boolean }> {
  if (zipBuffer.byteLength > MAX_ZIP_BYTES) {
    throw new Error("ZIP too large");
  }

  let unzipped: Record<string, Uint8Array>;
  try {
    unzipped = unzipSync(new Uint8Array(zipBuffer), {
      filter: (file) => {
        if (file.originalSize > MAX_FILE_BYTES) return false;
        return safeRelPath(file.name) !== null;
      },
    });
  } catch {
    throw new Error("Invalid ZIP");
  }

  const entries = Object.keys(unzipped);
  if (entries.length === 0) throw new Error("Empty ZIP");
  if (entries.length > MAX_FILES) throw new Error("Too many files in ZIP");

  const extractDir = getFunnelExtractDir(id);
  try {
    await rm(extractDir, { recursive: true, force: true }).catch(() => null);
    await ensureDir(extractDir);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "disk error";
    throw new Error(`Cannot write to storage (${getFunnelsRoot()}): ${msg}`);
  }

  const written: string[] = [];
  let hasPhp = false;

  for (const rawName of entries) {
    const rel = safeRelPath(rawName);
    if (!rel) continue;
    const data = unzipped[rawName];
    if (!data || data.byteLength === 0) {
      if (rel.endsWith("/")) {
        await ensureDir(path.join(extractDir, rel));
      }
      continue;
    }
    if (/\.php$/i.test(rel)) hasPhp = true;
    const abs = path.join(extractDir, rel);
    const resolved = path.resolve(abs);
    const rootResolved = path.resolve(extractDir);
    if (!resolved.startsWith(rootResolved + path.sep) && resolved !== rootResolved) {
      continue;
    }
    await ensureDir(path.dirname(resolved));
    await writeFile(resolved, data);
    written.push(rel.replace(/\\/g, "/"));
  }

  if (written.length === 0) {
    throw new Error("ZIP has no usable files (only empty folders?)");
  }

  const entryFile = findEntryFile(written);
  const zipName = path.basename(originalName).slice(0, 240) || "funnel.zip";
  const zipPath = path.join(getFunnelDir(id), zipName);
  await ensureDir(getFunnelDir(id));
  await writeFile(zipPath, zipBuffer);

  await persistFunnelZipMeta(id, {
    zipFileName: zipName,
    zipSizeBytes: zipBuffer.byteLength,
    entryFile,
    fileCount: written.length,
    hasPhp,
  });

  return { fileCount: written.length, entryFile, hasPhp };
}

export function getFunnelZipPath(id: string, zipFileName: string): string {
  return path.join(getFunnelDir(id), zipFileName);
}

export function getFunnelPdfPath(id: string, pdfFileName = "preview.pdf"): string {
  return path.join(getFunnelDir(id), pdfFileName);
}

export async function saveFunnelPdf(
  id: string,
  pdfBuffer: Buffer,
  downloadName?: string,
): Promise<{ pdfFileName: string }> {
  const funnel = await prisma.funnel.findUnique({ where: { id } });
  if (!funnel) throw new Error("Not found");

  const safeBase = (downloadName || funnel.name || "preview")
    .replace(/[^\w\u0400-\u04FF.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  const pdfFileName = `${safeBase || "preview"}.pdf`;

  await ensureDir(getFunnelDir(id));
  await writeFile(getFunnelPdfPath(id, pdfFileName), pdfBuffer);

  // Remove previous PDF if renamed
  const prev = (funnel as { pdfFileName?: string | null }).pdfFileName;
  if (prev && prev !== pdfFileName) {
    await rm(getFunnelPdfPath(id, prev), { force: true }).catch(() => null);
  }

  try {
    await prisma.funnel.update({
      where: { id },
      data: { pdfFileName } as Parameters<typeof prisma.funnel.update>[0]["data"],
    });
  } catch {
    /* column may not exist yet — file is still on disk */
  }

  return { pdfFileName };
}

export async function readFunnelPdf(
  id: string,
): Promise<{ abs: string; fileName: string } | null> {
  const funnel = await prisma.funnel.findUnique({ where: { id } });
  if (!funnel) return null;
  const named = (funnel as { pdfFileName?: string | null }).pdfFileName;
  const candidates = [
    named,
    "preview.pdf",
  ].filter((x): x is string => Boolean(x));

  for (const fileName of candidates) {
    const abs = getFunnelPdfPath(id, fileName);
    try {
      await access(abs, constants.R_OK);
      return { abs, fileName };
    } catch {
      /* try next */
    }
  }
  return null;
}

export async function listFunnelFiles(id: string): Promise<string[]> {
  const root = getFunnelExtractDir(id);
  try {
    await access(root, constants.R_OK);
  } catch {
    return [];
  }

  const out: string[] = [];

  async function walk(dir: string, prefix: string) {
    const items = await readdir(dir, { withFileTypes: true });
    for (const item of items) {
      const rel = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.isDirectory()) {
        await walk(path.join(dir, item.name), rel);
      } else {
        out.push(rel.replace(/\\/g, "/"));
      }
    }
  }

  await walk(root, "");
  return out.sort((a, b) => a.localeCompare(b));
}

export async function resolveFunnelFile(
  id: string,
  relPath: string,
): Promise<{ abs: string; rel: string } | null> {
  const safe = safeRelPath(relPath);
  if (!safe) return null;
  const root = path.resolve(getFunnelExtractDir(id));
  const abs = path.resolve(path.join(root, safe));
  if (!abs.startsWith(root + path.sep) && abs !== root) return null;
  try {
    await access(abs, constants.R_OK);
  } catch {
    return null;
  }
  return { abs, rel: safe };
}

export async function readFunnelFile(
  id: string,
  relPath: string,
): Promise<Buffer | null> {
  const resolved = await resolveFunnelFile(id, relPath);
  if (!resolved) return null;
  return readFile(resolved.abs);
}

/** Soft PHP preview: strip PHP blocks so HTML/CSS/JS still renders. */
export function softPreviewPhp(content: string): string {
  let out = content.replace(/<\?(?:php|=)?[\s\S]*?\?>/gi, "");
  // Only strip a trailing unclosed PHP block (not random `<?` in content)
  out = out.replace(/<\?(?:php|=)[\s\S]*$/i, "");
  return out;
}

export function guessContentType(filePath: string): string {
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
  };
  return map[ext] ?? "application/octet-stream";
}

export function listPreviewablePages(files: string[]): string[] {
  return files.filter((f) => /\.(html?|php)$/i.test(f)).slice(0, 40);
}

/** Heal zipSizeBytes from disk when column was missing on older uploads. */
export async function syncZipSizeFromDisk(id: string): Promise<number> {
  const funnel = await prisma.funnel.findUnique({ where: { id } });
  if (!funnel?.zipFileName) return 0;
  try {
    const st = await stat(getFunnelZipPath(id, funnel.zipFileName));
    try {
      await prisma.funnel.update({
        where: { id },
        data: { zipSizeBytes: st.size } as Parameters<
          typeof prisma.funnel.update
        >[0]["data"],
      });
    } catch {
      /* column may not exist yet */
    }
    return st.size;
  } catch {
    return 0;
  }
}
