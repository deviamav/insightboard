import { NextRequest, NextResponse } from "next/server";
import {
  bumpSessionVersion,
  countAdmins,
  createUser,
  deleteUser,
  getPrimaryAdminId,
  listUsers,
  updateUserPassword,
} from "@/lib/users";
import {
  createUserSession,
  getSessionUser,
  isAdminAuthenticated,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  createUserSchema,
  forceLogoutUserSchema,
  updateUserPasswordSchema,
} from "@/lib/validations";
import type { UserRole } from "@/types/user";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [users, primaryAdminId] = await Promise.all([
    listUsers(),
    getPrimaryAdminId(),
  ]);
  return NextResponse.json({ users, primaryAdminId });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(`create-user:${ip}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  try {
    const user = await createUser(
      parsed.data.username,
      parsed.data.password,
      parsed.data.role,
    );
    return NextResponse.json(user, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Username already exists" }, { status: 409 });
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const logoutParsed = forceLogoutUserSchema.safeParse(body);
  if (logoutParsed.success) {
    const current = await getSessionUser();
    if (current?.id === logoutParsed.data.id) {
      return NextResponse.json(
        { error: "Cannot force-logout yourself" },
        { status: 400 },
      );
    }
    const target = await listUsers().then((u) =>
      u.find((x) => x.id === logoutParsed.data.id),
    );
    if (!target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const sessionVersion = await bumpSessionVersion(target.id);
    return NextResponse.json({ ok: true, sessionVersion });
  }

  const passwordParsed = updateUserPasswordSchema.safeParse(body);
  if (!passwordParsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const current = await getSessionUser();
  const target = await listUsers().then((u) =>
    u.find((x) => x.id === passwordParsed.data.id),
  );
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isSelf = current?.id === target.id;
  await updateUserPassword(target.id, passwordParsed.data.password);

  if (isSelf) {
    const full = await prisma.user.findUnique({
      where: { id: target.id },
      select: { id: true, username: true, role: true, sessionVersion: true },
    });
    if (full) {
      await createUserSession({
        id: full.id,
        username: full.username,
        role: full.role as UserRole,
        sessionVersion: full.sessionVersion,
      });
    }
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const current = await getSessionUser();
  if (current?.id === id) {
    return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
  }

  const target = await listUsers().then((u) => u.find((x) => x.id === id));
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const primaryAdminId = await getPrimaryAdminId();
  if (primaryAdminId && target.id === primaryAdminId) {
    return NextResponse.json(
      { error: "Cannot delete primary administrator" },
      { status: 403 },
    );
  }

  if (target.role === "admin") {
    const admins = await countAdmins();
    if (admins <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin" },
        { status: 400 },
      );
    }
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
