import { SignJWT, jwtVerify } from "jose";
import type { SessionUser, UserRole } from "@/types/user";

export const SESSION_COOKIE = "fs_session";
export const SESSION_MAX_AGE_SEC = 7 * 24 * 60 * 60;
const SESSION_TTL = "7d";

function getSecretKey(): Uint8Array | null {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) return null;
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(
  user: SessionUser,
): Promise<string | null> {
  const key = getSecretKey();
  if (!key) return null;

  return new SignJWT({
    sub: user.id,
    username: user.username,
    role: user.role,
    sv: user.sessionVersion ?? 0,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_TTL)
    .sign(key);
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<SessionUser | null> {
  if (!token) return null;
  const key = getSecretKey();
  if (!key) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      (payload.role !== "admin" && payload.role !== "user")
    ) {
      return null;
    }
    const sv =
      typeof payload.sv === "number" && Number.isFinite(payload.sv)
        ? payload.sv
        : 0;
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role as UserRole,
      sessionVersion: sv,
    };
  } catch {
    return null;
  }
}
