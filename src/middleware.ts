import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SESSION_COOKIE, verifySessionToken } from "./lib/session";

const intlMiddleware = createMiddleware(routing);

const securityHeaders: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-DNS-Prefetch-Control": "off",
};

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth/")) return true;
  return /^\/(ru|en)\/login\/?$/.test(pathname);
}

function applySecurityHeaders(
  response: NextResponse,
  opts?: { allowFrame?: boolean },
): NextResponse {
  for (const [key, value] of Object.entries(securityHeaders)) {
    if (opts?.allowFrame && key === "X-Frame-Options") {
      response.headers.set(key, "SAMEORIGIN");
      continue;
    }
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySessionToken(token);

  if (pathname.startsWith("/api/")) {
    if (!pathname.startsWith("/api/auth/login")) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (pathname.startsWith("/api/users") && session.role !== "admin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return applySecurityHeaders(NextResponse.next(), {
      allowFrame: /\/api\/funnels\/[^/]+\/(files|asset)/.test(pathname),
    });
  }

  if (
    session &&
    session.role !== "admin" &&
    /^\/(ru|en)\/users\/?$/.test(pathname)
  ) {
    const locale = pathname.startsWith("/en") ? "en" : "ru";
    return applySecurityHeaders(
      NextResponse.redirect(new URL(`/${locale}`, request.url)),
    );
  } else if (!isPublicPath(pathname) && !session) {
    const locale =
      routing.locales.find((l) => pathname.startsWith(`/${l}`)) ??
      routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    if (pathname !== `/${locale}` && pathname !== `/${locale}/`) {
      loginUrl.searchParams.set("from", pathname);
    }
    return applySecurityHeaders(NextResponse.redirect(loginUrl));
  }

  const response = intlMiddleware(request);
  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
