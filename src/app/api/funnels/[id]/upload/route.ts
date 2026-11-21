import { NextRequest, NextResponse } from "next/server";
import { extractFunnelZip, getFunnel, getFunnelsRoot } from "@/lib/funnels-storage";
import { isAuthenticated } from "@/lib/auth";
import { access, constants, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asUploadFile(value: FormDataEntryValue | null): {
  name: string;
  arrayBuffer: () => Promise<ArrayBuffer>;
} | null {
  if (!value || typeof value === "string") return null;
  // Node/undici may give File or Blob
  const blob = value as Blob & { name?: string };
  if (typeof blob.arrayBuffer !== "function") return null;
  return {
    name: typeof blob.name === "string" && blob.name ? blob.name : "upload.zip",
    arrayBuffer: () => blob.arrayBuffer(),
  };
}

export async function POST(
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

  const storageRoot = getFunnelsRoot();
  try {
    await mkdir(path.join(storageRoot, id), { recursive: true });
    await access(path.join(storageRoot, id), constants.W_OK);
  } catch (err) {
    const detail = err instanceof Error ? err.message : "EACCES";
    return NextResponse.json(
      {
        error: `Storage not writable (${storageRoot}): ${detail}`,
      },
      { status: 500 },
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    const detail = err instanceof Error ? err.message : "formData failed";
    return NextResponse.json(
      {
        error: `Cannot read upload body (file too large or truncated?): ${detail}`,
      },
      { status: 400 },
    );
  }

  const file = asUploadFile(form.get("file"));
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".zip")) {
    return NextResponse.json({ error: "Only ZIP allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength < 22) {
    return NextResponse.json(
      { error: "ZIP empty or truncated (check size limit / proxy)" },
      { status: 400 },
    );
  }

  try {
    const result = await extractFunnelZip(id, buffer, file.name);
    const updated = await getFunnel(id);
    return NextResponse.json({ ...updated, ...result });
  } catch (err) {
    console.error("[funnels/upload]", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
