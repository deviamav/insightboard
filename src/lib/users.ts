import { prisma } from "./prisma";
import { hashPassword } from "./auth";

export async function seedAdminUser(): Promise<void> {
  const count = await prisma.user.count();
  if (count > 0) return;

  const username = (process.env.ADMIN_USERNAME ?? "admin").toLowerCase();
  const password =
    process.env.ADMIN_PASSWORD ?? process.env.ADMIN_SECRET ?? "";

  if (!password || password.length < 8) {
    console.warn("[seed] Skip admin: set ADMIN_PASSWORD or ADMIN_SECRET (min 8)");
    return;
  }

  await prisma.user.create({
    data: {
      username,
      passwordHash: await hashPassword(password),
      role: "admin",
    },
  });

  console.log(`[seed] Created admin user: ${username}`);
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function createUser(
  username: string,
  password: string,
  role: "admin" | "user",
) {
  return prisma.user.create({
    data: {
      username: username.toLowerCase(),
      passwordHash: await hashPassword(password),
      role,
    },
    select: { id: true, username: true, role: true, createdAt: true },
  });
}

export async function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}

export async function bumpSessionVersion(id: string): Promise<number> {
  const user = await prisma.user.update({
    where: { id },
    data: { sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  return user.sessionVersion;
}

export async function updateUserPassword(
  id: string,
  password: string,
): Promise<void> {
  await prisma.user.update({
    where: { id },
    data: {
      passwordHash: await hashPassword(password),
      sessionVersion: { increment: 1 },
    },
  });
}

export async function countAdmins() {
  return prisma.user.count({ where: { role: "admin" } });
}

/** First created admin — cannot be deleted by other admins. */
export async function getPrimaryAdminId(): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return admin?.id ?? null;
}
