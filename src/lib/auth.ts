import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SEC,
  createSessionToken,
  verifySessionToken,
} from "./session";
import type { SessionUser, UserRole } from "@/types/user";

export async function createUserSession(user: SessionUser): Promise<boolean> {
  const token = await createSessionToken(user);
  if (!token) return false;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
  });
  return true;
}

export async function destroyUserSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const jwtUser = await verifySessionToken(token);
  if (!jwtUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: jwtUser.id },
    select: {
      id: true,
      username: true,
      role: true,
      sessionVersion: true,
    },
  });
  if (!dbUser) return null;

  if ((jwtUser.sessionVersion ?? 0) !== dbUser.sessionVersion) {
    return null;
  }

  return {
    id: dbUser.id,
    username: dbUser.username,
    role: dbUser.role as UserRole,
    sessionVersion: dbUser.sessionVersion,
  };
}

export async function requireSession(): Promise<SessionUser | null> {
  return getSessionUser();
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getSessionUser()) !== null;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "admin";
}

export async function authenticateUser(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
  });
  if (!user) return null;

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role as UserRole,
    sessionVersion: user.sessionVersion,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Legacy alias
export const createAdminSession = createUserSession;
export const destroyAdminSession = destroyUserSession;
