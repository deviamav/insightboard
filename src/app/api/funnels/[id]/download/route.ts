import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ZIP download is disabled — only upload is allowed. */
export async function GET(
  _request: NextRequest,
  _context: { params: Promise<{ id: string }> },
) {
  return NextResponse.json(
    { error: "ZIP download is disabled" },
    { status: 403 },
  );
}
